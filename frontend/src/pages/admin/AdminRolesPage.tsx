import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Check, X, Users, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import { RoleItem } from "../../types";

export const AdminRolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        api.getAdminRoles(),
        api.getPermissions(),
      ]);
      setRoles(rolesData);
      setAllPermissions(permsData.all_permissions || []);
    } catch (err) {
      console.error("Failed to load roles and permissions:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f1ec] text-[#104336] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
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
                Security & Authorization Architecture
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#104336]">
                Role & Permission Matrix
              </h1>
            </div>
          </div>

          <button
            onClick={loadData}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#104336]/15 hover:border-[#104336] text-xs font-mono flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Catalog
          </button>
        </div>

        {/* 3 Core Roles Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roles.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-[#104336]/10 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#104336]/5 text-[11px] font-mono font-bold text-[#104336]">
                  <Shield className="w-3.5 h-3.5" />
                  {r.name}
                </div>
                <span className="text-xs font-mono text-[#104336]/60 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {r.user_count} Users
                </span>
              </div>

              <p className="text-xs text-[#104336]/70 leading-relaxed min-h-[3rem]">
                {r.description || "Operational role with predefined access bounds."}
              </p>

              <div className="pt-2 border-t border-[#104336]/5 flex items-center justify-between text-xs font-mono text-[#104336]/80">
                <span>Granted Permissions:</span>
                <span className="font-bold text-[#104336]">
                  {r.permissions.length} capabilities
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Full Role-Permission Matrix Table */}
        <div className="bg-white rounded-2xl border border-[#104336]/10 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#104336]/10 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-[#104336]">
              Granular Permission Mapping Catalogue
            </h2>
            <div className="text-xs font-mono text-[#104336]/60">
              Backend-Enforced Server-Side Authorization
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f3f1ec]/80 border-b border-[#104336]/10 font-mono text-[#104336]/70 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-1/3">Permission Key</th>
                  <th className="py-3 px-4 w-1/3">Functional Description</th>
                  {roles.map((r) => (
                    <th key={r.id} className="py-3 px-4 text-center font-bold text-[#104336]">
                      {r.name === "DRILLING_ENGINEER"
                        ? "Engineer"
                        : r.name === "DRILLING_SUPERVISOR"
                        ? "Supervisor"
                        : "Knowledge Admin"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#104336]/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#104336]/60">
                      Loading matrix...
                    </td>
                  </tr>
                ) : allPermissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#104336]/60">
                      No permissions catalogued.
                    </td>
                  </tr>
                ) : (
                  allPermissions.map((perm) => (
                    <tr key={perm.name} className="hover:bg-[#f3f1ec]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-[#104336]">
                        {perm.name}
                      </td>
                      <td className="py-3 px-4 text-[#104336]/70">
                        {perm.description || "—"}
                      </td>
                      {roles.map((r) => {
                        const hasIt = r.permissions.some((p) => p.name === perm.name);
                        return (
                          <td key={r.id} className="py-3 px-4 text-center">
                            {hasIt ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-50 text-gray-300">
                                <X className="w-3 h-3 stroke-[2]" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
