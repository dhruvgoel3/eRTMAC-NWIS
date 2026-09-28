import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
  allowedRoles,
}) => {
  const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-viewport" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3, marginBottom: 16 }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-slate)" }}>
          eRTMAC-NWIS · Initializing Operational Session
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/403" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/403" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.some((r) => hasRole(r))) {
    return <Navigate to="/403" replace />;
  }

  return children ? <>{children}</> : null;
};
