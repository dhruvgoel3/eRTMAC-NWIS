"""
Authentication API Router
Endpoints for user session context, permissions, and client-reported audit events.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Request, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user, AuthenticatedUser
from app.models.auth import Permission
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["auth"])


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
