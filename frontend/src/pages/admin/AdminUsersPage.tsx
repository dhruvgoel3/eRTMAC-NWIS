import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Shield,
  ArrowLeft,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Power,
  KeyRound,
  Edit2,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../services/api";
import { AdminUserItem, RoleItem } from "../../types";

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");

  // Create User modal state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [newFullName, setNewFullName] = useState<string>("");
  const [newEmployeeId, setNewEmployeeId] = useState<string>("");
  const [newDepartment, setNewDepartment] = useState<string>("Drilling Operations");
  const [newDesignation, setNewDesignation] = useState<string>("Drilling Engineer");
  const [newRole, setNewRole] = useState<string>("DRILLING_ENGINEER");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<boolean>(false);

  // Edit Role modal state
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editRoleSelection, setEditRoleSelection] = useState<string>("");

  // Disable/Enable toggle confirm modal
  const [userToToggle, setUserToToggle] = useState<AdminUserItem | null>(null);

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load admin users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const rolesData = await api.getAdminRoles();
      setRoles(rolesData);
    } catch (err) {
      console.error("Failed to load roles list:", err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(false);

    try {
      await api.createAdminUser({
        email: newEmail.trim(),
        password: newPassword,
        full_name: newFullName.trim(),
        employee_id: newEmployeeId.trim() || undefined,
        department: newDepartment.trim(),
        designation: newDesignation.trim(),
        role: newRole,
      });

      setCreateSuccess(true);
      setTimeout(() => {
        setIsCreateOpen(false);
        setCreateSuccess(false);
        setNewEmail("");
        setNewPassword("");
        setNewFullName("");
        setNewEmployeeId("");
        loadUsers();
      }, 1500);
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || err.message || "Failed to create user");
    }
  };

  const handleConfirmToggle = async () => {
    if (!userToToggle) return;
    try {
      if (userToToggle.is_active) {
        await api.disableAdminUser(userToToggle.id);
      } else {
        await api.enableAdminUser(userToToggle.id);
      }
      setUserToToggle(null);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Action failed");
    }
  };

  const handleSaveRole = async () => {
    if (!editingUser || !editRoleSelection) return;
    try {
      await api.assignUserRole(editingUser.id, editRoleSelection);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to update user role");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.employee_id && u.employee_id.toLowerCase().includes(search.toLowerCase()));
    const matchesRole =
      selectedRoleFilter === "ALL" || u.roles.includes(selectedRoleFilter);
    return matchesSearch && matchesRole;
  });

  return (
    <div className="profile-viewport">
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Navigation & Title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link
              to="/"
              className="profile-back-btn"
              title="Return to Dashboard"
            >
              <ArrowLeft style={{ width: 18, height: 18 }} />
            </Link>
            <div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-slate)" }}>
                Administration & Access Control
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-bark)", margin: 0 }}>
                User Management Directory
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={loadUsers}
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 12 }}
            >
              <RefreshCw style={{ width: 14, height: 14 }} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 12 }}
            >
              <UserPlus style={{ width: 14, height: 14 }} />
              <span>Provision User</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="profile-card" style={{ padding: "14px 18px", display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ position: "relative", minWidth: 260, flex: "1 1 260px" }}>
            <Search style={{ width: 15, height: 15, position: "absolute", left: 12, top: 12, color: "var(--color-muted-slate)" }} />
            <input
              type="text"
              placeholder="Search by name, email, or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="auth-input"
              style={{ fontSize: 12, height: 38 }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)", textTransform: "uppercase" }}>Role:</span>
            {["ALL", "DRILLING_ENGINEER", "DRILLING_SUPERVISOR", "KNOWLEDGE_ADMIN"].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: selectedRoleFilter === r ? "1px solid var(--color-canopy)" : "1px solid var(--color-sage-mist)",
                  background: selectedRoleFilter === r ? "var(--color-canopy)" : "var(--color-sheet-white)",
                  color: selectedRoleFilter === r ? "#ffffff" : "var(--color-slate)",
                  transition: "all 0.15s ease",
                }}
              >
                {r === "ALL" ? "All Roles" : r.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="profile-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
              <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--color-sage-mist)", fontFamily: "var(--font-mono)", textTransform: "uppercase", fontSize: 11, color: "var(--color-muted-slate)" }}>
                <tr>
                  <th style={{ padding: "12px 16px" }}>Operator Identity</th>
                  <th style={{ padding: "12px 16px" }}>Employee ID</th>
                  <th style={{ padding: "12px 16px" }}>Department / Designation</th>
                  <th style={{ padding: "12px 16px" }}>Assigned Role</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 36, textAlign: "center", color: "var(--color-muted-slate)" }}>
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 36, textAlign: "center", color: "var(--color-muted-slate)" }}>
                      No user accounts found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const primaryRole = u.roles[0] || "No Role";
                    return (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: "1px solid rgba(175, 196, 191, 0.25)",
                          background: idx % 2 === 0 ? "var(--color-sheet-white)" : "var(--bg-elevated)",
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 700, color: "var(--color-bark)" }}>{u.full_name}</div>
                          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted-slate)" }}>{u.email}</div>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-slate)" }}>
                          {u.employee_id || "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ color: "var(--color-bark)" }}>{u.department || "Operations"}</div>
                          <div style={{ fontSize: 11, color: "var(--color-muted-slate)" }}>{u.designation || "Engineer"}</div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 9999, background: "rgba(16, 67, 54, 0.08)", color: "var(--color-canopy)", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                            <Shield style={{ width: 12, height: 12 }} />
                            <span>{primaryRole}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {u.is_active ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "rgba(13, 122, 78, 0.1)", color: "#0d7a4e", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                              <CheckCircle2 style={{ width: 12, height: 12 }} /> ACTIVE
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: "rgba(185, 28, 66, 0.1)", color: "#b91c42", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                              <XCircle style={{ width: 12, height: 12 }} /> DISABLED
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditRoleSelection(u.roles[0] || "DRILLING_ENGINEER");
                              }}
                              style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--color-sage-mist)", background: "var(--bg-elevated)", fontSize: 11, cursor: "pointer", color: "var(--color-canopy)" }}
                              title="Modify Role"
                            >
                              <Edit2 style={{ width: 12, height: 12 }} />
                            </button>
                            <button
                              onClick={() => setUserToToggle(u)}
                              style={{
                                padding: "5px 10px",
                                borderRadius: 8,
                                border: "none",
                                fontSize: 11,
                                cursor: "pointer",
                                background: u.is_active ? "rgba(185, 28, 66, 0.1)" : "rgba(13, 122, 78, 0.1)",
                                color: u.is_active ? "#b91c42" : "#0d7a4e",
                                fontWeight: 600,
                              }}
                            >
                              {u.is_active ? "Disable" : "Enable"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {userToToggle && (
        <div className="auth-modal-backdrop">
          <div className="auth-modal-dialog" style={{ maxWidth: 380, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(185, 28, 66, 0.1)", color: "#b91c42", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Power style={{ width: 24, height: 24 }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-bark)", margin: "0 0 8px" }}>
              {userToToggle.is_active ? "Disable User Account?" : "Enable User Account?"}
            </h3>
            <p style={{ fontSize: 12, color: "var(--color-slate)", margin: "0 0 20px", lineHeight: 1.5 }}>
              Are you sure you want to {userToToggle.is_active ? "disable" : "reactivate"}{" "}
              <strong style={{ color: "var(--color-bark)" }}>{userToToggle.email}</strong>?{" "}
              {userToToggle.is_active
                ? "The user will immediately be blocked from accessing protected NWIS operations."
                : "The user will regain access to authorized resources."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setUserToToggle(null)}
                className="btn-secondary"
                style={{ flex: 1, padding: "8px 16px", fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                style={{
                  flex: 1,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  background: userToToggle.is_active ? "#b91c42" : "#0d7a4e",
                  color: "#ffffff",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="auth-modal-backdrop">
          <div className="auth-modal-dialog" style={{ maxWidth: 440 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-bark)", margin: "0 0 4px" }}>
              Provision Platform Account
            </h3>
            <p style={{ fontSize: 12, color: "var(--color-slate)", margin: "0 0 16px", lineHeight: 1.5 }}>
              Creates a verified Supabase identity, employee profile, and RBAC mapping.
            </p>

            {createSuccess ? (
              <div className="auth-alert-success" style={{ marginBottom: 16 }}>
                <CheckCircle2 style={{ width: 16, height: 16 }} />
                <span>User account provisioned successfully!</span>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="auth-form" style={{ gap: 12 }}>
                {createError && (
                  <div className="auth-alert-error" style={{ marginBottom: 4 }}>
                    <AlertTriangle style={{ width: 16, height: 16 }} />
                    <span>{createError}</span>
                  </div>
                )}
                <div className="auth-field">
                  <label className="auth-label">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Das"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="auth-input"
                    style={{ paddingLeft: 12 }}
                  />
                </div>

                <div className="auth-form-row">
                  <div className="auth-field">
                    <label className="auth-label">Official Email</label>
                    <input
                      type="email"
                      required
                      placeholder="user@oilindia.in"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="auth-input"
                      style={{ paddingLeft: 12 }}
                    />
                  </div>
                  <div className="auth-field">
                    <label className="auth-label">Employee ID</label>
                    <input
                      type="text"
                      placeholder="OIL-4809"
                      value={newEmployeeId}
                      onChange={(e) => setNewEmployeeId(e.target.value)}
                      className="auth-input"
                      style={{ paddingLeft: 12 }}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Initial Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="auth-input"
                    style={{ paddingLeft: 12 }}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label">Assigned Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="auth-select"
                    style={{ paddingLeft: 12 }}
                  >
                    <option value="DRILLING_ENGINEER">Drilling Engineer (Operational View)</option>
                    <option value="DRILLING_SUPERVISOR">Drilling Supervisor (Supervisory)</option>
                    <option value="KNOWLEDGE_ADMIN">Knowledge Administrator (Admin)</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: "9px 16px", fontSize: 12 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: "9px 16px", fontSize: 12 }}
                  >
                    Provision Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="auth-modal-backdrop">
          <div className="auth-modal-dialog" style={{ maxWidth: 380 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--color-bark)", margin: "0 0 4px" }}>
              Modify User Role Assignment
            </h3>
            <p style={{ fontSize: 12, color: "var(--color-slate)", margin: "0 0 16px" }}>
              Update access tier for <strong style={{ color: "var(--color-bark)" }}>{editingUser.email}</strong>.
            </p>

            <div className="auth-field" style={{ marginBottom: 20 }}>
              <label className="auth-label">Select Active Role</label>
              <select
                value={editRoleSelection}
                onChange={(e) => setEditRoleSelection(e.target.value)}
                className="auth-select"
                style={{ paddingLeft: 12 }}
              >
                <option value="DRILLING_ENGINEER">Drilling Engineer</option>
                <option value="DRILLING_SUPERVISOR">Drilling Supervisor</option>
                <option value="KNOWLEDGE_ADMIN">Knowledge Administrator</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="btn-secondary"
                style={{ flex: 1, padding: "8px 16px", fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                className="btn-primary"
                style={{ flex: 1, padding: "8px 16px", fontSize: 12 }}
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
