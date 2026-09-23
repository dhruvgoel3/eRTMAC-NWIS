"""
Audit logging service for eRTMAC-NWIS.
Records security, user lifecycle, AI queries, and operational actions in audit_logs table.
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.auth import AuditLog


def log_audit_event(
    db: Session,
    action: str,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """
    Safely creates an audit log entry.
    Does NOT store sensitive credentials, passwords, or tokens.
    """
    try:
        # Scrub sensitive keys from metadata if present
        clean_meta = None
        if metadata:
            scrubbed = dict(metadata)
            for sensitive_key in ("password", "token", "access_token", "refresh_token", "secret", "api_key"):
                if sensitive_key in scrubbed:
                    scrubbed[sensitive_key] = "[REDACTED]"
            clean_meta = scrubbed

        entry = AuditLog(
            user_id=user_id,
            action=action.upper(),
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent[:250] if user_agent else None,
            meta=clean_meta,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
    except Exception as e:
        db.rollback()
        print(f"[Audit Log Error] Failed to write audit event '{action}': {e}")
        return None
