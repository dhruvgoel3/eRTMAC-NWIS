"""
Idempotent Auth & RBAC Seed Script for eRTMAC-NWIS.
Creates the 3 core roles, permission catalogue, role-permission mappings,
and provisions the 3 demo users in Supabase Auth and PostgreSQL profiles.
"""
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

# Load environment
for p in [backend_dir / ".env", backend_dir.parent / ".env", Path(".env")]:
    if p.is_file():
        load_dotenv(p)
        break

from app.database import SessionLocal, engine, Base
from app.models.auth import Profile, Role, Permission, UserRole, RolePermission, AuditLog
from app.services.supabase_service import get_supabase_client

# ─── 1. Role Definitions ──────────────────────────────────────────────────────
ROLES_DATA = [
    {
        "name": "DRILLING_ENGINEER",
        "description": "Primary NWIS user: Real-time well monitoring, offset well similarity, risk zones, alerts, AI Copilot, simulator",
    },
    {
        "name": "DRILLING_SUPERVISOR",
        "description": "Operational oversight: Multi-well surveillance, risk escalation, audit activity, team performance",
    },
    {
        "name": "KNOWLEDGE_ADMIN",
        "description": "System & Data Administrator: User provisioning, role assignment, document ingestion, knowledge-base management, audit inspection",
    },
]

# ─── 2. Permission Catalogue ──────────────────────────────────────────────────
PERMISSIONS_DATA = [
    {"name": "dashboard.view", "description": "View master drilling operations dashboard and telemetry"},
    {"name": "wells.view", "description": "View active and offset well dossiers"},
    {"name": "wells.nearby", "description": "Search and filter nearby offset wells on geospatial map"},
    {"name": "wells.compare", "description": "Compare parameters and profiles across multiple wells"},
    {"name": "events.view", "description": "Explore historical drilling events and NPT records"},
    {"name": "risk.view", "description": "View depth-indexed geological hazard and risk zones"},
    {"name": "alerts.view", "description": "View active real-time advisory and hazard alerts"},
    {"name": "alerts.acknowledge", "description": "Acknowledge active alerts for the current well"},
    {"name": "alerts.escalate", "description": "Escalate high-severity alerts to operational management"},
    {"name": "ai.query", "description": "Ask questions to NWIS AI Assistant / RAG pipeline"},
    {"name": "ai.view_sources", "description": "Inspect retrieved evidence, source documents, and confidence metrics"},
    {"name": "documents.view", "description": "Read well completion reports, daily drilling reports, and technical documents"},
    {"name": "documents.upload", "description": "Upload new well documents and reports"},
    {"name": "documents.update", "description": "Edit document metadata and geological tags"},
    {"name": "documents.delete", "description": "Remove documents from the knowledge repository"},
    {"name": "documents.process", "description": "Trigger OCR, chunking, and embedding generation for documents"},
    {"name": "simulation.view", "description": "View live eRTMAC drilling simulation progress"},
    {"name": "simulation.control", "description": "Start, pause, reset, or alter speed of drilling simulation"},
    {"name": "users.view", "description": "View team roster, employee profiles, and active statuses"},
    {"name": "users.create", "description": "Provision new user accounts and send invites"},
    {"name": "users.update", "description": "Edit employee profiles, designations, and enable/disable accounts"},
    {"name": "users.disable", "description": "Revoke platform access for specified accounts"},
    {"name": "roles.view", "description": "Inspect system roles and permission matrices"},
    {"name": "roles.assign", "description": "Assign or update user role designations"},
    {"name": "audit.view", "description": "Inspect platform security, query, and operational audit logs"},
    {"name": "system.manage", "description": "Configure system settings, demo parameters, and system caches"},
]

ENGINEER_PERMISSIONS = [
    "dashboard.view",
    "wells.view",
    "wells.nearby",
    "wells.compare",
    "events.view",
    "risk.view",
    "alerts.view",
    "alerts.acknowledge",
    "ai.query",
    "ai.view_sources",
    "documents.view",
    "simulation.view",
    "simulation.control",
]

SUPERVISOR_PERMISSIONS = [
    "dashboard.view",
    "wells.view",
    "wells.nearby",
    "wells.compare",
    "events.view",
    "risk.view",
    "alerts.view",
    "alerts.acknowledge",
    "alerts.escalate",
    "ai.query",
    "ai.view_sources",
    "documents.view",
    "simulation.view",
]

ADMIN_PERMISSIONS = [
    "dashboard.view",
    "wells.view",
    "wells.nearby",
    "wells.compare",
    "events.view",
    "risk.view",
    "ai.query",
    "ai.view_sources",
    "documents.view",
    "documents.upload",
    "documents.update",
    "documents.delete",
    "documents.process",
    "users.view",
    "users.create",
    "users.update",
    "users.disable",
    "roles.view",
    "roles.assign",
    "audit.view",
    "system.manage",
]

ROLE_PERMISSIONS_MAPPING = {
    "DRILLING_ENGINEER": ENGINEER_PERMISSIONS,
    "DRILLING_SUPERVISOR": SUPERVISOR_PERMISSIONS,
    "KNOWLEDGE_ADMIN": ADMIN_PERMISSIONS,
}

# ─── 4. Demo Users ────────────────────────────────────────────────────────────
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "OIL_nwis_demo_2026!")

DEMO_USERS = [
    {
        "email": "engineer@nwis.demo",
        "full_name": "Rajesh Borah",
        "employee_id": "OIL-ENG-1042",
        "department": "Drilling Operations",
        "designation": "Senior Drilling Engineer",
        "role": "DRILLING_ENGINEER",
        "phone": "+91 374 280 2145",
    },
    {
        "email": "supervisor@nwis.demo",
        "full_name": "Ananya Sarma",
        "employee_id": "OIL-SUP-0819",
        "department": "Field Oversight",
        "designation": "Drilling Superintendent",
        "role": "DRILLING_SUPERVISOR",
        "phone": "+91 374 280 1888",
    },
    {
        "email": "admin@nwis.demo",
        "full_name": "Dhruv Goel",
        "employee_id": "OIL-ADM-0044",
        "department": "Information Systems & Data",
        "designation": "Knowledge & Platform Administrator",
        "role": "KNOWLEDGE_ADMIN",
        "phone": "+91 374 280 0012",
        "is_active": True,
    },
    {
        "email": "disabled_operator@nwis.demo",
        "full_name": "Disabled Operator",
        "employee_id": "OIL-OPS-9999",
        "department": "Field Operations",
        "designation": "Associate Operator (Inactive)",
        "role": "DRILLING_ENGINEER",
        "phone": "+91 374 280 9999",
        "is_active": False,
    },
]



def seed_rbac():
    print("[Seed Auth] Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    supabase = get_supabase_client()

    try:
        # 1. Seed Roles
        print("[Seed Auth] Seeding roles...")
        roles_by_name = {}
        for r_data in ROLES_DATA:
            role = db.query(Role).filter(Role.name == r_data["name"]).first()
            if not role:
                role = Role(
                    name=r_data["name"],
                    description=r_data["description"],
                )
                db.add(role)
                db.commit()
                db.refresh(role)
                print(f"  + Created Role: {role.name}")
            else:
                role.description = r_data["description"]
                db.commit()
                print(f"  * Existing Role: {role.name}")
            roles_by_name[role.name] = role

        # 2. Seed Permissions
        print("[Seed Auth] Seeding permissions...")
        perms_by_name = {}
        for p_data in PERMISSIONS_DATA:
            perm = db.query(Permission).filter(Permission.name == p_data["name"]).first()
            if not perm:
                perm = Permission(
                    name=p_data["name"],
                    description=p_data["description"],
                )
                db.add(perm)
                db.commit()
                db.refresh(perm)
                print(f"  + Created Permission: {perm.name}")
            else:
                perm.description = p_data["description"]
                db.commit()
            perms_by_name[perm.name] = perm

        # 3. Seed Role-Permission Mappings
        print("[Seed Auth] Mapping role permissions...")
        for role_name, perm_list in ROLE_PERMISSIONS_MAPPING.items():
            role = roles_by_name[role_name]
            allowed_perm_ids = set()
            for perm_name in perm_list:
                perm = perms_by_name.get(perm_name)
                if not perm:
                    continue
                allowed_perm_ids.add(perm.id)
                rp = db.query(RolePermission).filter(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm.id,
                ).first()
                if not rp:
                    rp = RolePermission(role_id=role.id, permission_id=perm.id)
                    db.add(rp)
            # Prune obsolete role permissions
            if allowed_perm_ids:
                db.query(RolePermission).filter(
                    RolePermission.role_id == role.id,
                    ~RolePermission.permission_id.in_(allowed_perm_ids),
                ).delete(synchronize_session=False)
            db.commit()
            print(f"  * Configured permissions for {role_name} ({len(perm_list)} grants)")

        # 4. Provision Demo Users in Supabase Auth & PostgreSQL Profiles
        print("[Seed Auth] Provisioning demo users...")
        for u_data in DEMO_USERS:
            email = u_data["email"].lower()
            auth_user_id = None

            # Attempt to create or retrieve from Supabase Auth
            if supabase:
                try:
                    # Check if user already exists in Supabase
                    users_page = supabase.auth.admin.list_users()
                    for u in users_page:
                        if u.email.lower() == email:
                            auth_user_id = u.id
                            break

                    if not auth_user_id:
                        res = supabase.auth.admin.create_user({
                            "email": email,
                            "password": DEMO_PASSWORD,
                            "email_confirm": True,
                            "user_metadata": {
                                "full_name": u_data["full_name"],
                                "employee_id": u_data["employee_id"],
                            },
                        })
                        if hasattr(res, "user") and res.user:
                            auth_user_id = res.user.id
                            print(f"  + Created Supabase Auth user: {email} ({auth_user_id})")
                    else:
                        # Ensure password is set to DEMO_PASSWORD
                        supabase.auth.admin.update_user_by_id(
                            str(auth_user_id),
                            {"password": DEMO_PASSWORD, "email_confirm": True}
                        )
                        print(f"  * Re-synchronized Supabase Auth user: {email} ({auth_user_id})")
                except Exception as e:
                    print(f"  ! Supabase Auth admin operation warning for {email}: {e}")

            if not auth_user_id:
                # If Supabase Auth offline or mock, generate persistent UUID
                auth_user_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"{email}.nwis.oilindia.in")
                print(f"  ~ Fallback Auth UUID assigned: {auth_user_id}")

            # Check / Create Profile
            profile = db.query(Profile).filter(Profile.email == email).first()
            if not profile:
                profile = Profile(
                    auth_user_id=auth_user_id,
                    employee_id=u_data["employee_id"],
                    full_name=u_data["full_name"],
                    email=email,
                    department=u_data["department"],
                    designation=u_data["designation"],
                    phone=u_data["phone"],
                    is_active=u_data.get("is_active", True),
                )
                db.add(profile)
                db.commit()
                db.refresh(profile)
                print(f"  + Created Profile for: {email}")
            else:
                profile.auth_user_id = auth_user_id
                profile.full_name = u_data["full_name"]
                profile.employee_id = u_data["employee_id"]
                profile.department = u_data["department"]
                profile.designation = u_data["designation"]
                profile.phone = u_data["phone"]
                profile.is_active = u_data.get("is_active", True)
                db.commit()
                print(f"  * Updated Profile for: {email}")

            # Assign Role in user_roles
            target_role = roles_by_name[u_data["role"]]
            # Remove any conflicting role assignment
            db.query(UserRole).filter(UserRole.user_id == profile.id).delete()
            ur = UserRole(
                user_id=profile.id,
                role_id=target_role.id,
                assigned_by=profile.id,
            )
            db.add(ur)
            db.commit()
            print(f"  [OK] Assigned Role '{target_role.name}' to {email}")

        # 5. Seed Initial Audit Logs
        print("[Seed Auth] Recording initial audit log trail...")
        sample_logs = [
            ("SYSTEM_INIT", "PLATFORM", "eRTMAC-NWIS", {"version": "1.0.0", "status": "BOOTSTRAP_COMPLETE"}),
            ("ROLE_ASSIGNED", "USER", "engineer@nwis.demo", {"role": "DRILLING_ENGINEER"}),
            ("ROLE_ASSIGNED", "USER", "supervisor@nwis.demo", {"role": "DRILLING_SUPERVISOR"}),
            ("ROLE_ASSIGNED", "USER", "admin@nwis.demo", {"role": "KNOWLEDGE_ADMIN"}),
            ("AI_QUERY", "AI_AGENT", "OIL-X123", {"query": "What are the primary hazards in Tipam Sandstone?", "sources": 3}),
            ("ALERT_ACKNOWLEDGED", "ALERT", "OIL-X123-A01", {"severity": "HIGH", "depth": 3120}),
        ]
        for action, res_type, res_id, meta in sample_logs:
            entry = AuditLog(
                action=action,
                resource_type=res_type,
                resource_id=res_id,
                ip_address="127.0.0.1",
                user_agent="NWIS Seed Process / Automation",
                meta=meta,
            )
            db.add(entry)
        db.commit()
        print("  [OK] Seeded baseline audit log records.")

        print("\n=======================================================")
        print("[OK] RBAC SEEDING COMPLETED SUCCESSFULLY!")
        print("  Demo Users Available:")
        print(f"  1. engineer@nwis.demo   [DRILLING_ENGINEER]   Password: {DEMO_PASSWORD}")
        print(f"  2. supervisor@nwis.demo [DRILLING_SUPERVISOR] Password: {DEMO_PASSWORD}")
        print(f"  3. admin@nwis.demo      [KNOWLEDGE_ADMIN]     Password: {DEMO_PASSWORD}")
        print("=======================================================\n")

    except Exception as e:
        db.rollback()
        print(f"[Seed Auth Fatal Error] {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_rbac()
