"""
Automated unit & integration tests for NWIS Authentication & RBAC system.
Tests Supabase identity resolution, role-permission enforcement, and 401/403 security controls.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_public_health_endpoints():
    """Unauthenticated public endpoints should be accessible."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_unauthenticated_requests_return_401():
    """Direct API requests without a valid Bearer token must return 401 Unauthorized."""
    endpoints = [
        "/api/wells",
        "/api/wells/active",
        "/api/dashboard/OIL-X123",
        "/api/events",
        "/api/alerts",
        "/api/admin/users",
        "/api/admin/roles",
        "/api/admin/audit-logs",
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 401, f"Endpoint {ep} expected 401 but got {res.status_code}"
        body = res.json()
        assert body.get("success") is False
        assert body.get("error", {}).get("code") == "UNAUTHORIZED"


def test_invalid_token_returns_401():
    """Requests with forged or expired token must return 401."""
    headers = {"Authorization": "Bearer forged_invalid_token_xyz123"}
    res = client.get("/api/wells", headers=headers)
    assert res.status_code == 401


def test_drilling_engineer_authorization():
    """
    Role: DRILLING_ENGINEER
    - ALLOW: wells.view, dashboard.view, ai.query
    - DENY: users.create, audit.view, roles.view (403 Forbidden)
    """
    headers = {"Authorization": "Bearer demo_token_engineer"}

    # Permitted endpoints
    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["data"]["email"] == "engineer@nwis.demo"
    assert "DRILLING_ENGINEER" in res_me.json()["data"]["roles"]

    res_wells = client.get("/api/wells", headers=headers)
    assert res_wells.status_code == 200

    # Denied admin endpoints (must return 403 Forbidden)
    res_admin_users = client.get("/api/admin/users", headers=headers)
    assert res_admin_users.status_code == 403
    assert res_admin_users.json()["error"]["code"] == "FORBIDDEN"

    res_audit = client.get("/api/admin/audit-logs", headers=headers)
    assert res_audit.status_code == 403


def test_drilling_supervisor_authorization():
    """
    Role: DRILLING_SUPERVISOR
    - ALLOW: wells.view, dashboard.view, ai.query
    - STRICT DENY: audit.view, users.view, users.create, roles.view (Must return 403 Forbidden)
    """
    headers = {"Authorization": "Bearer demo_token_supervisor"}

    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert "DRILLING_SUPERVISOR" in res_me.json()["data"]["roles"]

    # Supervisor CANNOT access administrative audit logs (must return 403 Forbidden)
    res_audit = client.get("/api/admin/audit-logs", headers=headers)
    assert res_audit.status_code == 403
    assert res_audit.json()["error"]["code"] == "FORBIDDEN"

    # Supervisor CANNOT access user management (must return 403 Forbidden)
    res_users = client.get("/api/admin/users", headers=headers)
    assert res_users.status_code == 403
    assert res_users.json()["error"]["code"] == "FORBIDDEN"

    # Supervisor CANNOT create users
    res_create = client.post("/api/admin/users", headers=headers, json={"email": "test@demo.com"})
    assert res_create.status_code == 403
    assert res_create.json()["error"]["code"] == "FORBIDDEN"


def test_role_dashboard_isolation():
    """
    Role Dashboard Isolation:
    - Engineer Dashboard: Only DRILLING_ENGINEER (Supervisor & Admin get 403)
    - Supervisor Dashboard: Only DRILLING_SUPERVISOR (Engineer & Admin get 403)
    - Admin Overview: Only KNOWLEDGE_ADMIN (Engineer & Supervisor get 403)
    """
    eng_headers = {"Authorization": "Bearer demo_token_engineer"}
    sup_headers = {"Authorization": "Bearer demo_token_supervisor"}
    adm_headers = {"Authorization": "Bearer demo_token_admin"}

    # Engineer Dashboard
    assert client.get("/api/engineer/dashboard", headers=eng_headers).status_code == 200
    assert client.get("/api/engineer/dashboard", headers=sup_headers).status_code == 403
    assert client.get("/api/engineer/dashboard", headers=adm_headers).status_code == 403

    # Supervisor Dashboard
    assert client.get("/api/supervisor/dashboard", headers=sup_headers).status_code == 200
    assert client.get("/api/supervisor/dashboard", headers=eng_headers).status_code == 403
    assert client.get("/api/supervisor/dashboard", headers=adm_headers).status_code == 403

    # Admin Overview
    assert client.get("/api/admin/overview", headers=adm_headers).status_code == 200
    assert client.get("/api/admin/overview", headers=eng_headers).status_code == 403
    assert client.get("/api/admin/overview", headers=sup_headers).status_code == 403


def test_ai_assistant_rbac_isolation():
    """
    AI Assistant RBAC:
    Non-admin querying users, passwords, or audit logs must be blocked with an informative notice.
    """
    eng_headers = {"Authorization": "Bearer demo_token_engineer"}
    res = client.post("/api/ai/query", headers=eng_headers, json={"question": "Show me all users in the system"})
    assert res.status_code == 200
    data = res.json()
    assert "user administration is outside your access scope" in data["answer"].lower()


def test_knowledge_admin_authorization():
    """
    Role: KNOWLEDGE_ADMIN
    - ALLOW: users.view, users.create, roles.view, audit.view
    """
    headers = {"Authorization": "Bearer demo_token_admin"}

    res_me = client.get("/api/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert "KNOWLEDGE_ADMIN" in res_me.json()["data"]["roles"]

    res_roles = client.get("/api/admin/roles", headers=headers)
    assert res_roles.status_code == 200
    roles = res_roles.json()["data"]
    role_names = [r["name"] for r in roles]
    assert "DRILLING_ENGINEER" in role_names
    assert "DRILLING_SUPERVISOR" in role_names
    assert "KNOWLEDGE_ADMIN" in role_names

    res_audit = client.get("/api/admin/audit-logs", headers=headers)
    assert res_audit.status_code == 200


def test_disabled_user_blocked():
    """A disabled account must receive 403 and cannot access any protected endpoints."""
    from app.database import SessionLocal
    from app.models.auth import Profile

    db = SessionLocal()
    try:
        test_email = "disabled_operator@nwis.demo"
        profile = db.query(Profile).filter(Profile.email == test_email).first()
        if not profile:
            import uuid
            profile = Profile(
                auth_user_id=uuid.uuid4(),
                email=test_email,
                full_name="Disabled Operator",
                is_active=False,
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
        else:
            profile.is_active = False
            db.commit()

        headers = {"Authorization": "Bearer demo_token_disabled"}
        res = client.get("/api/wells", headers=headers)
        assert res.status_code == 403
        body = res.json()
        assert body["error"]["code"] == "ACCOUNT_DISABLED"

    finally:
        db.close()

