"""
Authentication API Router
Endpoints for user session context, permissions, and client-reported audit events.
"""
import uuid
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, EmailStr
from fastapi import APIRouter, Depends, Request, Body, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user, AuthenticatedUser
from app.models.auth import Profile, Role, UserRole, Permission
from app.services.supabase_service import get_supabase_client
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterPayload(BaseModel):
    email: str
    password: Optional[str] = None
    full_name: str
    employee_id: Optional[str] = None
    department: Optional[str] = "Drilling Operations"
    designation: Optional[str] = "Drilling Engineer"
    role: Optional[str] = "DRILLING_ENGINEER"
    auth_user_id: Optional[str] = None


@router.post("/register")
def register_user(
    payload: RegisterPayload,
    db: Session = Depends(get_db),
):
    """
    Registers or provisions an NWIS user profile and assigns role.
    Integrates with Supabase Auth identities.
    """
    email = payload.email.strip().lower()
    existing_profile = db.query(Profile).filter(Profile.email == email).first()
    if existing_profile:
        return {
            "success": True,
            "message": "User profile already registered.",
            "profile_id": str(existing_profile.id),
        }

    auth_uid = payload.auth_user_id
    # If auth_user_id was not directly passed, attempt lookup in Supabase
    client = get_supabase_client()
    if not auth_uid and client and payload.password:
        try:
            signup_res = client.auth.sign_up({
                "email": email,
                "password": payload.password,
                "options": {
                    "data": {
                        "full_name": payload.full_name,
                        "department": payload.department,
                        "designation": payload.designation,
                        "employee_id": payload.employee_id,
                    }
                }
            })
            if signup_res and getattr(signup_res, "user", None):
                auth_uid = str(signup_res.user.id)
        except Exception as e:
            # If user already registered in Supabase auth
            print(f"[Register] Supabase sign_up notice: {e}")

    if not auth_uid:
        # Generate stable placeholder if Supabase user is not immediately fetched
        auth_uid = str(uuid.uuid4())

    target_role_name = (payload.role or "DRILLING_ENGINEER").upper()
    # Knowledge Admin role cannot be self-requested
    if target_role_name not in ("DRILLING_ENGINEER", "DRILLING_SUPERVISOR"):
        target_role_name = "DRILLING_ENGINEER"

    role = db.query(Role).filter(Role.name == target_role_name).first()
    if not role:
        role = db.query(Role).filter(Role.name == "DRILLING_ENGINEER").first()

    profile = Profile(
        auth_user_id=auth_uid,
        email=email,
        full_name=payload.full_name.strip(),
        department=payload.department,
        designation=payload.designation,
        employee_id=payload.employee_id,
        is_active=True,
    )
    db.add(profile)
    db.flush()

    if role:
        ur = UserRole(user_id=profile.id, role_id=role.id)
        db.add(ur)

    db.commit()
    db.refresh(profile)

    return {
        "success": True,
        "message": "User profile successfully registered.",
        "profile_id": str(profile.id),
        "role": target_role_name,
    }



@router.get("/me")
def get_my_profile(
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns the authenticated user's profile, roles, and permission catalogue.
    """
    return {
        "success": True,
        "data": user.to_dict(),
    }


@router.get("/permissions")
def get_user_permissions(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns all system permissions and marks which ones the current user has.
    """
    all_perms = db.query(Permission).order_by(Permission.name).all()
    user_perms = user.permissions

    return {
        "success": True,
        "data": {
            "user_permissions": sorted(list(user_perms)),
            "all_permissions": [
                {
                    "name": p.name,
                    "description": p.description,
                    "granted": p.name in user_perms,
                }
                for p in all_perms
            ],
        },
    }


@router.post("/audit")
def record_client_audit(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Allows client to record lifecycle events (e.g., LOGIN, LOGOUT).
    """
    action = payload.get("action", "CLIENT_EVENT")
    meta = payload.get("metadata", {})

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    log = log_audit_event(
        db=db,
        user_id=user.id,
        action=action,
        resource_type="SESSION",
        resource_id=user.email,
        ip_address=client_ip,
        user_agent=user_agent,
        metadata=meta,
    )

    return {"success": True, "logged": log is not None}
