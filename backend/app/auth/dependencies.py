"""
FastAPI authentication and RBAC authorization dependencies.
Enforces Supabase JWT verification and PostgreSQL permission validation server-side.
"""
import os
from typing import List, Optional, Set
from fastapi import Depends, HTTPException, Security, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.auth import Profile, Role, Permission, UserRole, RolePermission
from app.services.supabase_service import get_supabase_client

security_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Represents a validated authenticated user with their profile, roles, and permissions."""
    def __init__(
        self,
        id: str,
        auth_user_id: str,
        email: str,
        full_name: str,
        employee_id: Optional[str] = None,
        department: Optional[str] = None,
        designation: Optional[str] = None,
        is_active: bool = True,
        roles: Optional[List[str]] = None,
        permissions: Optional[Set[str]] = None,
    ):
        self.id = str(id)
        self.auth_user_id = str(auth_user_id)
        self.email = email
        self.full_name = full_name
        self.employee_id = employee_id
        self.department = department
        self.designation = designation
        self.is_active = is_active
        self.roles = roles or []
        self.active_role = self.roles[0] if self.roles else "DRILLING_ENGINEER"
        self.permissions = permissions or set()

    def has_permission(self, perm: str) -> bool:
        return perm in self.permissions

    def has_role(self, role: str) -> bool:
        return role in self.roles

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "auth_user_id": self.auth_user_id,
            "email": self.email,
            "full_name": self.full_name,
            "employee_id": self.employee_id,
            "department": self.department,
            "designation": self.designation,
            "is_active": self.is_active,
            "roles": self.roles,
            "active_role": self.active_role,
            "permissions": sorted(list(self.permissions)),
        }


def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    db: Session = Depends(get_db),
) -> Optional[AuthenticatedUser]:
    """
    Returns AuthenticatedUser if valid token provided; returns None if no token.
    Raises 401 if token is invalid or 403 if user account is disabled.
    """
    token = None
    if credentials:
        token = credentials.credentials
    elif "authorization" in request.headers:
        auth_hdr = request.headers["authorization"]
        if auth_hdr.lower().startswith("bearer "):
            token = auth_hdr.split(" ", 1)[1].strip()

    if not token:
        return None

    # Verify with Supabase Auth
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "error": {"code": "CONFIG_ERROR", "message": "Authentication service is not configured."}},
        )

    auth_user_id = None
    user_email = None

    try:
        # Validate token against Supabase Auth service
        user_response = client.auth.get_user(token)
        if user_response and getattr(user_response, "user", None):
            auth_user_id = str(user_response.user.id)
            user_email = user_response.user.email
    except Exception as e:
        # Token validation failed
        print(f"[Auth Error] Supabase JWT validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid or expired session token."}},
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not auth_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid or expired session token."}},
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Query Profile from DB
    profile = None
    if auth_user_id:
        profile = db.query(Profile).filter(Profile.auth_user_id == auth_user_id).first()
    if not profile and user_email:
        profile = db.query(Profile).filter(Profile.email == user_email).first()
        if profile and auth_user_id:
            profile.auth_user_id = auth_user_id
            db.commit()

    if not profile and auth_user_id and user_email:
        # Auto-provision profile from Supabase Auth identity
        user_meta = getattr(user_response.user, "user_metadata", {}) or {}
        full_name = user_meta.get("full_name") or user_email.split("@")[0].replace(".", " ").capitalize()
        dept = user_meta.get("department") or "Drilling Operations"
        designation = user_meta.get("designation") or "Drilling Engineer"
        emp_id = user_meta.get("employee_id")

        try:
            profile = Profile(
                auth_user_id=auth_user_id,
                email=user_email,
                full_name=full_name,
                department=dept,
                designation=designation,
                employee_id=emp_id,
                is_active=True,
            )
            db.add(profile)
            db.flush()

            role_req = (user_meta.get("role_request") or "").upper()
            target_role_name = "DRILLING_SUPERVISOR" if role_req == "DRILLING_SUPERVISOR" else "DRILLING_ENGINEER"
            role = db.query(Role).filter(Role.name == target_role_name).first()
            if not role:
                role = db.query(Role).filter(Role.name == "DRILLING_ENGINEER").first()
            if role:
                ur = UserRole(user_id=profile.id, role_id=role.id)
                db.add(ur)
            db.commit()
            db.refresh(profile)
        except Exception as e:
            db.rollback()
            print(f"[Auth Error] Failed to auto-provision profile: {e}")

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "error": {"code": "UNAUTHORIZED", "message": "Session token verification failed or profile not found."}},
            headers={"WWW-Authenticate": "Bearer"},
        )





    # Check if account is active
    if not profile.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "success": False,
                "error": {
                    "code": "ACCOUNT_DISABLED",
                    "message": "Your account has been disabled. Please contact the system administrator.",
                },
            },
        )

    # Fetch User Roles
    user_roles = (
        db.query(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == profile.id)
        .all()
    )
    role_names = [r.name for r in user_roles]
    role_ids = [r.id for r in user_roles]

    # Fetch Permissions mapped to user roles
    permissions = set()
    if role_ids:
        perm_records = (
            db.query(Permission.name)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .filter(RolePermission.role_id.in_(role_ids))
            .all()
        )
        permissions = set(p[0] for p in perm_records)

    return AuthenticatedUser(
        id=profile.id,
        auth_user_id=profile.auth_user_id,
        email=profile.email,
        full_name=profile.full_name,
        employee_id=profile.employee_id,
        department=profile.department,
        designation=profile.designation,
        is_active=profile.is_active,
        roles=role_names,
        permissions=permissions,
    )


def get_current_user(
    user: Optional[AuthenticatedUser] = Depends(get_current_user_optional),
) -> AuthenticatedUser:
    """Strict dependency: requires an authenticated active user."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "success": False,
                "error": {
                    "code": "UNAUTHORIZED",
                    "message": "Authentication required. Please provide a valid Bearer token.",
                },
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_permission(perm: str):
    """
    Factory creating a FastAPI dependency enforcing that the authenticated user
    possesses the specified permission.
    """
    def permission_dependency(
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if not user.has_permission(perm):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": f"Access denied. You do not have permission '{perm}' to perform this action.",
                    },
                },
            )
        return user

    return permission_dependency


def require_role(role_name: str):
    """
    Factory creating a FastAPI dependency enforcing that the authenticated user
    has the specified role.
    """
    def role_dependency(
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if not user.has_role(role_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": f"Access denied. Requires role '{role_name}'.",
                    },
                },
            )
        return user

    return role_dependency
