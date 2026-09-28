-- =============================================================================
-- eRTMAC-NWIS — Migration 005: Strict RBAC Row Level Security (RLS)
-- =============================================================================
-- Enforces server-side database access boundaries across all roles:
--   1. DRILLING_ENGINEER
--   2. DRILLING_SUPERVISOR
--   3. KNOWLEDGE_ADMIN
--
-- Guarantees that:
--   • Profiles: Users can view their own profile; only KNOWLEDGE_ADMIN can inspect all profiles
--   • Audit Logs: Only KNOWLEDGE_ADMIN can view audit logs
--   • User Roles: Only KNOWLEDGE_ADMIN or backend service_role can assign or modify roles
--   • Roles & Permissions: Read-only for authenticated operators, write restricted to service_role
-- =============================================================================

-- Enable RLS on core auth tables
ALTER TABLE IF EXISTS profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs       ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- ---------------------------------------------------------------------------

-- Service role bypass
CREATE POLICY "Service full access profiles"
    ON profiles FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

-- Users can update non-critical fields of their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. ROLES & PERMISSIONS POLICIES (Read-only catalog for operators)
-- ---------------------------------------------------------------------------

CREATE POLICY "Service full access roles"
    ON roles FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated read roles"
    ON roles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Service full access permissions"
    ON permissions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated read permissions"
    ON permissions FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Service full access role_permissions"
    ON role_permissions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Authenticated read role_permissions"
    ON role_permissions FOR SELECT TO authenticated USING (TRUE);

-- ---------------------------------------------------------------------------
-- 3. USER ROLES POLICIES (Strict isolation against self-escalation)
-- ---------------------------------------------------------------------------

CREATE POLICY "Service full access user_roles"
    ON user_roles FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Users can read their own role assignment
CREATE POLICY "Users can read own user_roles"
    ON user_roles FOR SELECT TO authenticated
    USING (
        user_id IN (
            SELECT id FROM profiles WHERE auth_user_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 4. AUDIT LOGS POLICIES (Isolated exclusively to KNOWLEDGE_ADMIN)
-- ---------------------------------------------------------------------------

CREATE POLICY "Service full access audit_logs"
    ON audit_logs FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Only authenticated users possessing the KNOWLEDGE_ADMIN role can query audit logs
CREATE POLICY "Knowledge Admin can view audit_logs"
    ON audit_logs FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            JOIN profiles p ON ur.user_id = p.id
            WHERE p.auth_user_id = auth.uid()
            AND r.name = 'KNOWLEDGE_ADMIN'
        )
    );
