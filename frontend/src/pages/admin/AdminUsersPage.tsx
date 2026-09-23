import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Power,
  Search,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { api } from "../../services/api";
import { AdminUserItem } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

export const AdminUsersPage: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [search, setSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("ALL");

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("OIL_nwis_demo_2026!");
  const [newName, setNewName] = useState<string>("");
  const [newEmpId, setNewEmpId] = useState<string>("");
  const [newDept, setNewDept] = useState<string>("Drilling Operations");
  const [newDesig, setNewDesig] = useState<string>("Drilling Engineer");
  const [newRole, setNewRole] = useState<string>("DRILLING_ENGINEER");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<boolean>(false);

  // Status Confirmation Modal
  const [userToToggle, setUserToToggle] = useState<AdminUserItem | null>(null);

  useEffect(() => {
    loadUsers();
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      await api.createAdminUser({
        email: newEmail,
        password: newPassword,
        full_name: newName,
        employee_id: newEmpId,
        department: newDept,
        designation: newDesig,
        role: newRole,
      });
      setCreateSuccess(true);
      setTimeout(() => {
        setIsCreateOpen(false);
        setCreateSuccess(false);
        setNewEmail("");
        setNewName("");
        setNewEmpId("");
        loadUsers();
      }, 1000);
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || err.message || "Failed to create user.");
    }
  };

  const handleConfirmToggle = async () => {
    if (!userToToggle) return;
    try {
      await api.updateAdminUser(userToToggle.id, {
        is_active: !userToToggle.is_active,
      });
      setUserToToggle(null);
      await loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || "Failed to update user status");
    }
  };

  const handleChangeRole = async (userId: string, newRoleName: string) => {
    try {
      await api.updateAdminUser(userId, { role: newRoleName });
      await loadUsers();
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
    <div className="min-h-screen bg-[#f3f1ec] text-[#104336] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-xl bg-white border border-[#104336]/10 text-[#104336] hover:bg-[#104336]/5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="text-[11px] font-mono tracking-wider uppercase text-[#104336]/60">
                Administration & Access Control
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#104336]">
                User Management Directory
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadUsers}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#104336]/15 hover:border-[#104336] text-xs font-mono flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#104336] text-white hover:bg-[#0c3329] text-xs font-medium flex items-center gap-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-[#0fff87]" />
              Provision New User
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl border border-[#104336]/10 p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#104336]/40" />
            <input
              type="text"
              placeholder="Search by name, email, or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f3f1ec]/50 border border-[#104336]/15 rounded-xl text-xs text-[#104336] focus:outline-none focus:border-[#104336]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-mono text-[#104336]/60">Role:</span>
            {["ALL", "DRILLING_ENGINEER", "DRILLING_SUPERVISOR", "KNOWLEDGE_ADMIN"].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  selectedRoleFilter === r
                    ? "bg-[#104336] text-white"
                    : "bg-[#f3f1ec]/60 text-[#104336]/70 hover:bg-[#104336]/10"
                }`}
              >
                {r === "ALL" ? "All Roles" : r.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-[#104336]/10 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f3f1ec]/80 border-b border-[#104336]/10 font-mono text-[#104336]/70 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Department / Designation</th>
                  <th className="py-3 px-4">Active Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#104336]/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#104336]/60">
                      Loading user directory...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#104336]/60">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = profile?.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-[#f3f1ec]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#104336]">{u.full_name}</div>
                          <div className="font-mono text-[#104336]/60 text-[11px]">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#104336]">
                          {u.employee_id || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[#104336]">{u.designation || "Staff"}</div>
                          <div className="text-[11px] text-[#104336]/60">{u.department || "Operations"}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={u.active_role}
                            disabled={isSelf}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            className="text-xs font-mono px-2 py-1 rounded-lg border border-[#104336]/20 bg-white text-[#104336] focus:outline-none focus:border-[#104336]"
                          >
                            <option value="DRILLING_ENGINEER">DRILLING_ENGINEER</option>
                            <option value="DRILLING_SUPERVISOR">DRILLING_SUPERVISOR</option>
                            <option value="KNOWLEDGE_ADMIN">KNOWLEDGE_ADMIN</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                              u.is_active
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.is_active ? "bg-emerald-600" : "bg-rose-600"
                              }`}
                            />
                            {u.is_active ? "ACTIVE" : "DISABLED"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setUserToToggle(u)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                              isSelf
                                ? "opacity-30 cursor-not-allowed text-[#104336]/40"
                                : u.is_active
                                ? "border border-rose-200 text-rose-700 hover:bg-rose-50"
                                : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {u.is_active ? "Disable" : "Enable"}
                          </button>
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
        <div className="fixed inset-0 z-50 bg-[#104336]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#104336]/10 p-6 max-w-sm w-full shadow-lg">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Power className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center text-[#104336] mb-2">
              {userToToggle.is_active ? "Disable User Account?" : "Enable User Account?"}
            </h3>
            <p className="text-xs text-[#104336]/70 text-center mb-6">
              Are you sure you want to {userToToggle.is_active ? "disable" : "reactivate"}{" "}
              <strong className="text-[#104336]">{userToToggle.email}</strong>?{" "}
              {userToToggle.is_active
                ? "The user will immediately be blocked from accessing protected NWIS operations."
                : "The user will regain access to authorized resources."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUserToToggle(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#104336]/20 text-xs font-medium hover:bg-[#f3f1ec]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`flex-1 py-2.5 rounded-xl text-white text-xs font-medium ${
                  userToToggle.is_active
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-700 hover:bg-emerald-800"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-[#104336]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#104336]/10 p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-[#104336] mb-1">
              Provision Platform Account
            </h3>
            <p className="text-xs text-[#104336]/70 mb-4">
              Creates a verified Supabase identity, employee profile, and RBAC mapping.
            </p>

            {createSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                User account provisioned successfully!
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-3">
                {createError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {createError}
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-mono text-[#104336]/70 uppercase mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Bhaskar Hazarika"
                    className="w-full px-3 py-2 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-xs focus:outline-none focus:border-[#104336]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono text-[#104336]/70 uppercase mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      required
                      value={newEmpId}
                      onChange={(e) => setNewEmpId(e.target.value)}
                      placeholder="OIL-ENG-2044"
                      className="w-full px-3 py-2 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-xs font-mono focus:outline-none focus:border-[#104336]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#104336]/70 uppercase mb-1">
                      Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full px-3 py-2 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-xs font-mono focus:outline-none focus:border-[#104336]"
                    >
                      <option value="DRILLING_ENGINEER">DRILLING_ENGINEER</option>
                      <option value="DRILLING_SUPERVISOR">DRILLING_SUPERVISOR</option>
                      <option value="KNOWLEDGE_ADMIN">KNOWLEDGE_ADMIN</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#104336]/70 uppercase mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@nwis.demo"
                    className="w-full px-3 py-2 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-xs font-mono focus:outline-none focus:border-[#104336]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono text-[#104336]/70 uppercase mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="w-full px-3 py-2 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-xs focus:outline-none focus:border-[#104336]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#104336]/70 uppercase mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={newDesig}
                      onChange={(e) => setNewDesig(e.target.value)}
                      className="w-full px-3 py-2 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-xs focus:outline-none focus:border-[#104336]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#104336]/70 uppercase mb-1">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-xs font-mono focus:outline-none focus:border-[#104336]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[#104336]/20 text-xs font-medium hover:bg-[#f3f1ec]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#104336] text-white text-xs font-medium hover:bg-[#0c3329]"
                  >
                    Create User
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
