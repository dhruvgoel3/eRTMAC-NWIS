import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User, Shield, ArrowLeft, Mail, Phone, Building2, Briefcase, CheckCircle2, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";

export const ProfilePage: React.FC = () => {
  const { profile, activeRole, permissions, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState<string>(profile?.full_name || "");
  const [department, setDepartment] = useState<string>(profile?.department || "");
  const [designation, setDesignation] = useState<string>(profile?.designation || "");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await api.updateAdminUser(profile.id, {
        full_name: fullName,
        department,
        designation,
      });
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.response?.data?.error?.message || err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f1ec] text-[#104336] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl bg-white border border-[#104336]/10 text-[#104336] hover:bg-[#104336]/5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="text-[11px] font-mono tracking-wider uppercase text-[#104336]/60">
              Identity & Access
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#104336]">
              Operator Profile & Capabilities
            </h1>
          </div>
        </div>

        {/* Profile Details Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identity Snapshot Card */}
          <div className="bg-white rounded-2xl border border-[#104336]/10 p-6 shadow-sm flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#104336] text-[#0fff87] font-bold text-2xl flex items-center justify-center border-4 border-[#104336]/10 shadow-sm">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "O"}
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#104336]">{profile?.full_name}</h2>
              <div className="text-xs font-mono text-[#104336]/60">{profile?.email}</div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#104336] text-[#0fff87] text-xs font-mono font-bold tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              {activeRole}
            </div>

            <div className="w-full pt-4 border-t border-[#104336]/10 space-y-2 text-xs font-mono text-left">
              <div className="flex justify-between">
                <span className="text-[#104336]/60">Employee ID:</span>
                <span className="font-semibold text-[#104336]">{profile?.employee_id || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#104336]/60">Status:</span>
                <span className="text-emerald-700 font-bold">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#104336]/60">Environment:</span>
                <span className="text-[#104336]">DEMO PROTO</span>
              </div>
            </div>
          </div>

          {/* Edit Safe Fields Form */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-[#104336]/10 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#104336]/10">
              <h3 className="text-sm font-bold text-[#104336]">Operational Metadata</h3>
              <span className="text-[11px] font-mono text-[#104336]/50">
                Self-Service Profile
              </span>
            </div>

            {saveSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Profile updated successfully.
              </div>
            )}

            {saveError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {saveError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#104336]/80 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-sm focus:outline-none focus:border-[#104336]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#104336]/80 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-sm focus:outline-none focus:border-[#104336]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#104336]/80 uppercase tracking-wider mb-1.5">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-sm focus:outline-none focus:border-[#104336]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#104336]/80 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Assigned Role (Fixed)</span>
                  <span className="text-[10px] font-mono text-[#104336]/40 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Managed by Administrator
                  </span>
                </label>
                <input
                  type="text"
                  disabled
                  value={activeRole || ""}
                  className="w-full px-3.5 py-2.5 bg-[#f3f1ec]/80 border border-[#104336]/10 rounded-xl text-xs font-mono text-[#104336]/60 cursor-not-allowed"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#104336] text-white hover:bg-[#0c3329] text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Granted Capabilities Catalog */}
        <div className="bg-white rounded-2xl border border-[#104336]/10 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#104336]/10">
            <h3 className="text-sm font-bold text-[#104336]">
              Authorized Capabilities ({permissions.length} Grants)
            </h3>
            <span className="text-xs font-mono text-[#104336]/60">
              Resolved from active role: {activeRole}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {permissions.map((perm) => (
              <div
                key={perm}
                className="px-3 py-2 rounded-xl bg-[#f3f1ec]/60 border border-[#104336]/10 text-xs font-mono text-[#104336] flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#0fff87]" />
                <span className="truncate">{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
