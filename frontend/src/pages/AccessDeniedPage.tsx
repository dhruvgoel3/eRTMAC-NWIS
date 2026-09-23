import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const AccessDeniedPage: React.FC = () => {
  const { profile, activeRole } = useAuth();

  return (
    <div className="min-h-screen bg-[#f3f1ec] flex flex-col items-center justify-center p-6 text-[#104336]">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#104336]/10 p-8 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#104336]/5 text-xs font-mono tracking-wider uppercase text-[#104336]/70 mb-3">
          HTTP 403 · Access Denied
        </div>

        <h1 className="text-2xl font-bold text-[#104336] mb-2 tracking-tight">
          Restricted Resource
        </h1>

        <p className="text-sm text-[#104336]/70 mb-6 leading-relaxed">
          You do not have permission to access this resource under your current role assignment
          {activeRole ? (
            <span className="font-semibold text-[#104336]"> ({activeRole})</span>
          ) : null}
          . Please contact the Knowledge Administrator if you require elevated privileges.
        </p>

        {profile && (
          <div className="bg-[#f3f1ec]/60 rounded-xl p-4 mb-6 text-left text-xs font-mono space-y-1.5 border border-[#104336]/5">
            <div className="flex justify-between text-[#104336]/70">
              <span>Account:</span>
              <span className="font-medium text-[#104336]">{profile.email}</span>
            </div>
            <div className="flex justify-between text-[#104336]/70">
              <span>Active Role:</span>
              <span className="font-semibold text-[#104336]">{profile.active_role}</span>
            </div>
            <div className="flex justify-between text-[#104336]/70">
              <span>Status:</span>
              <span className="text-emerald-700 font-semibold">ACTIVE</span>
            </div>
          </div>
        )}

        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#104336] hover:bg-[#0c3329] text-white font-medium text-sm transition-all duration-150"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>

      <div className="mt-8 text-center text-xs text-[#104336]/40 font-mono">
        eRTMAC-NWIS · Oil India Limited · Operational Decision Support
      </div>
    </div>
  );
};
