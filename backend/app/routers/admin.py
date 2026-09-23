"""
Admin API Router for User Management, RBAC, and Audit Logs.
Protected by fine-grained permissions.
"""
import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.auth.dependencies import require_permission, AuthenticatedUser
from app.models.auth import Profile, Role, Permission, UserRole, RolePermission, AuditLog
from app.services.supabase_service import get_supabase_client
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def list_users(
    user: AuthenticatedUser = Depends(require_permission("users.view")),
    db: Session = Depends(get_db),
):
    """
    List all platform users with their profiles, assigned roles, and active status.
    Requires: users.view
    """
    profiles = db.query(Profile).order_by(Profile.created_at.desc()).all()
    results = []

    for p in profiles:
        roles = (
            db.query(Role)
            .join(UserRole, UserRole.role_id == Role.id)
            .filter(UserRole.user_id == p.id)
            .all()
        )
        role_names = [r.name for r in roles]

        results.append({
            "id": str(p.id),
            "auth_user_id": str(p.auth_user_id),
            "employee_id": p.employee_id,
            "full_name": p.full_name,
            "email": p.email,
            "department": p.department,
            "designation": p.designation,
            "phone": p.phone,
            "is_active": p.is_active,
            "roles": role_names,
            "active_role": role_names[0] if role_names else "DRILLING_ENGINEER",
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })

    return {"success": True, "data": results}


@router.post("/users")
def create_user(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    admin: AuthenticatedUser = Depends(require_permission("users.create")),
    db: Session = Depends(get_db),
):
    """
    Admin provisions a new user via Supabase Auth + Profile + Role assignment.
    Requires: users.create
    """
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "").strip()
    full_name = payload.get("full_name", "").strip()
    employee_id = payload.get("employee_id", "").strip()
    department = payload.get("department", "Operations")
    designation = payload.get("designation", "Staff")
    role_name = payload.get("role", "DRILLING_ENGINEER").strip().upper()

    if not email or not password or not full_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Email, password, and full name are required."}},
        )

    # Verify role exists
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "error": {"code": "ROLE_NOT_FOUND", "message": f"Role '{role_name}' does not exist."}},
        )

    # Check if profile already exists in DB
    existing_profile = db.query(Profile).filter((Profile.email == email) | (Profile.employee_id == employee_id)).first()
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "error": {"code": "USER_EXISTS", "message": "User with this email or employee ID already exists."}},
        )

    # Provision user in Supabase Auth via Admin client
    supabase = get_supabase_client()
    auth_user_id = None
    if supabase:
        try:
            auth_res = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": full_name,
                    "employee_id": employee_id,
                },
            })
            if hasattr(auth_res, "user") and auth_res.user:
                auth_user_id = auth_res.user.id
        except Exception as e:
            # If user already exists in auth, try retrieving
            err_msg = str(e)
            if "already registered" in err_msg.lower():
                try:
                    users_list = supabase.auth.admin.list_users()
                    for u in users_list:
                        if u.email.lower() == email:
                            auth_user_id = u.id
                            break
                except Exception:
                    pass
            if not auth_user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"success": False, "error": {"code": "AUTH_PROVISION_ERROR", "message": f"Failed to provision user in Supabase Auth: {e}"}},
                )
    else:
        # Fallback UUID for mock/offline testing
        auth_user_id = uuid.uuid4()

    # Create Profile record
    new_profile = Profile(
        auth_user_id=auth_user_id,
        employee_id=employee_id or None,
        full_name=full_name,
        email=email,
        department=department,
        designation=designation,
        is_active=True,
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    # Assign Role
    user_role = UserRole(
        user_id=new_profile.id,
        role_id=role.id,
        assigned_by=uuid.UUID(admin.id),
    )
    db.add(user_role)
    db.commit()

    # Audit Log
    log_audit_event(
        db=db,
        action="USER_CREATED",
        user_id=admin.id,
        resource_type="USER",
        resource_id=email,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        metadata={
            "created_user_id": str(new_profile.id),
            "email": email,
            "role": role_name,
            "department": department,
        },
    )

    return {
        "success": True,
        "data": {
            "id": str(new_profile.id),
            "email": new_profile.email,
            "full_name": new_profile.full_name,
            "employee_id": new_profile.employee_id,
            "role": role_name,
            "is_active": new_profile.is_active,
        },
    }


@router.patch("/users/{user_id}")
def update_user(
    user_id: str,
    request: Request,
    payload: Dict[str, Any] = Body(...),
    admin: AuthenticatedUser = Depends(require_permission("users.update")),
    db: Session = Depends(get_db),
):
    """
    Update user status (enable/disable), department, designation, or role.
    Requires: users.update
    """
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "error": {"code": "NOT_FOUND", "message": "User not found."}},
        )

    # Check if admin is trying to disable or demote themselves
    if str(profile.id) == str(admin.id):
        if payload.get("is_active") is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "error": {"code": "SELF_MODIFICATION", "message": "You cannot disable your own admin account."}},
            )

    action_taken = "USER_UPDATED"

    # Update active status
    if "is_active" in payload:
        new_status = bool(payload["is_active"])
        if profile.is_active != new_status:
            profile.is_active = new_status
            action_taken = "USER_ENABLED" if new_status else "USER_DISABLED"

    # Update metadata
    if "department" in payload:
        profile.department = payload["department"]
    if "designation" in payload:
        profile.designation = payload["designation"]
    if "full_name" in payload:
        profile.full_name = payload["full_name"]

    # Update role if provided
    role_changed = False
    if "role" in payload:
        new_role_name = payload["role"].strip().upper()
        role = db.query(Role).filter(Role.name == new_role_name).first()
        if role:
            # Clear existing roles and assign new role
            db.query(UserRole).filter(UserRole.user_id == profile.id).delete()
            new_ur = UserRole(
                user_id=profile.id,
                role_id=role.id,
                assigned_by=uuid.UUID(admin.id),
            )
            db.add(new_ur)
            role_changed = True
            action_taken = "ROLE_CHANGED"

    db.commit()
    db.refresh(profile)

    # Audit event
    log_audit_event(
        db=db,
        action=action_taken,
        user_id=admin.id,
        resource_type="USER",
        resource_id=profile.email,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        metadata={
            "target_user_id": str(profile.id),
            "target_email": profile.email,
            "is_active": profile.is_active,
            "role_changed": role_changed,
        },
    )

    return {
        "success": True,
        "data": {
            "id": str(profile.id),
            "email": profile.email,
            "full_name": profile.full_name,
            "is_active": profile.is_active,
            "department": profile.department,
            "designation": profile.designation,
        },
    }


@router.get("/roles")
def list_roles_and_permissions(
    user: AuthenticatedUser = Depends(require_permission("roles.view")),
    db: Session = Depends(get_db),
):
    """
    Returns roles with description, user counts, and full mapped permissions list.
    Requires: roles.view
    """
    roles = db.query(Role).all()
    results = []

    for r in roles:
        # Count users in this role
        user_count = db.query(func.count(UserRole.id)).filter(UserRole.role_id == r.id).scalar() or 0

        # Permissions
        perms = (
            db.query(Permission)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .filter(RolePermission.role_id == r.id)
            .order_by(Permission.name)
            .all()
        )

        results.append({
            "id": str(r.id),
            "name": r.name,
            "description": r.description,
            "user_count": user_count,
            "permissions": [
                {
                    "name": p.name,
                    "description": p.description,
                }
                for p in perms
            ],
        })

    return {"success": True, "data": results}


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(50, le=200),
    action: Optional[str] = None,
    user: AuthenticatedUser = Depends(require_permission("audit.view")),
    db: Session = Depends(get_db),
):
    """
    Lists system audit logs with actor information.
    Requires: audit.view
    """
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action.upper())

    logs = q.order_by(AuditLog.created_at.desc()).limit(limit).all()

    results = []
    for log in logs:
        actor_email = None
        actor_name = None
        if log.user:
            actor_email = log.user.email
            actor_name = log.user.full_name

        results.append({
            "id": str(log.id),
            "timestamp": log.created_at.isoformat() if log.created_at else None,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_email": actor_email or "SYSTEM / GUEST",
            "user_name": actor_name or "System",
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "ip_address": log.ip_address,
            "metadata": log.meta,
        })

    return {"success": True, "data": results}
