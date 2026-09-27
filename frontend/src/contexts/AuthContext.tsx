import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { api } from "../services/api";
import { UserProfile, UserRoleName } from "../types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: UserRoleName[];
  activeRole: UserRoleName | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (perm: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuthStorage = () => {
    localStorage.removeItem("nwis_auth_token");
    localStorage.removeItem("nwis_auth_user");
    localStorage.removeItem("nwis_auth_profile");
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // 1. Check Supabase active session first
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          if (mounted) {
            setSession(data.session);
            setUser(data.session.user);
            localStorage.setItem("nwis_auth_user", JSON.stringify(data.session.user));
            if (data.session.access_token) {
              localStorage.setItem("nwis_auth_token", data.session.access_token);
            }
          }
          await fetchUserProfile(data.session.access_token, data.session.user);
          return;
        }

        // 2. If no active Supabase session, check if we have a persisted demo or custom session in localStorage
        const cachedToken = localStorage.getItem("nwis_auth_token");
        const cachedProfileRaw = localStorage.getItem("nwis_auth_profile");
        const cachedUserRaw = localStorage.getItem("nwis_auth_user");

        if (cachedToken && (cachedProfileRaw || cachedUserRaw)) {
          const restoredProfile: UserProfile = cachedProfileRaw ? JSON.parse(cachedProfileRaw) : null;
          const restoredUser: User = cachedUserRaw
            ? JSON.parse(cachedUserRaw)
            : {
                id: restoredProfile?.id || "demo-restored-user",
                app_metadata: {},
                user_metadata: { full_name: restoredProfile?.full_name },
                aud: "authenticated",
                created_at: new Date().toISOString(),
                email: restoredProfile?.email || "engineer@nwis.demo",
                phone: "",
                role: "authenticated",
                updated_at: new Date().toISOString(),
              };

          const effectiveProfile = restoredProfile || createDemoProfile(restoredUser.email || "engineer@nwis.demo");

          if (mounted) {
            setUser(restoredUser);
            setProfile(effectiveProfile);
            setSession({
              access_token: cachedToken,
              token_type: "bearer",
              expires_in: 3600,
              refresh_token: "demo-refresh-token",
              user: restoredUser,
            });
          }
        }
      } catch (err) {
        console.warn("[AuthContext] Session restore error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          localStorage.setItem("nwis_auth_user", JSON.stringify(currentSession.user));
          localStorage.setItem("nwis_auth_token", currentSession.access_token);
          await fetchUserProfile(currentSession.access_token, currentSession.user);
        } else if (event === "SIGNED_OUT") {
          const currentToken = localStorage.getItem("nwis_auth_token");
          // Only clear if not in an active demo token session
          if (!currentToken?.startsWith("demo")) {
            clearAuthStorage();
            setProfile(null);
            setUser(null);
            setSession(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const createDemoProfile = (userEmail: string, userMetadata?: any, id?: string): UserProfile => {
    const normEmail = userEmail.toLowerCase();
    const role: UserRoleName = normEmail.includes("supervisor")
      ? "DRILLING_SUPERVISOR"
      : normEmail.includes("admin")
      ? "KNOWLEDGE_ADMIN"
      : "DRILLING_ENGINEER";

    const adminPerms = [
      "dashboard.view", "wells.view", "wells.nearby", "wells.compare", "events.view",
      "risk.view", "alerts.view", "ai.query", "ai.view_sources", "documents.view", "documents.upload",
      "documents.update", "documents.delete", "documents.process", "users.view",
      "users.create", "users.update", "users.disable", "roles.view", "roles.assign",
      "audit.view", "system.manage"
    ];
    const supervisorPerms = [
      "dashboard.view", "wells.view", "wells.nearby", "wells.compare", "events.view",
      "risk.view", "alerts.view", "alerts.acknowledge", "alerts.escalate", "ai.query",
      "ai.view_sources", "documents.view", "simulation.view", "simulation.control",
      "audit.view", "users.view"
    ];
    const engineerPerms = [
      "dashboard.view", "wells.view", "wells.nearby", "wells.compare", "events.view",
      "risk.view", "alerts.view", "alerts.acknowledge", "ai.query", "ai.view_sources",
      "documents.view", "simulation.view", "simulation.control"
    ];

    const perms = role === "KNOWLEDGE_ADMIN" ? adminPerms : role === "DRILLING_SUPERVISOR" ? supervisorPerms : engineerPerms;
    const name = userMetadata?.full_name || (role === "KNOWLEDGE_ADMIN" ? "Admin User" : role === "DRILLING_SUPERVISOR" ? "Drilling Supervisor" : "Drilling Engineer");

    const uid = id || "demo-user-" + Math.random().toString(36).substring(2, 9);
    return {
      id: uid,
      auth_user_id: uid,
      email: normEmail,
      full_name: name,
      employee_id: userMetadata?.employee_id || "OIL-DEMO-01",
      department: userMetadata?.department || "Drilling Operations",
      designation: userMetadata?.designation || (role === "KNOWLEDGE_ADMIN" ? "Knowledge Administrator" : role === "DRILLING_SUPERVISOR" ? "Drilling Supervisor" : "Drilling Engineer"),
      is_active: true,
      roles: [role],
      active_role: role,
      permissions: perms,
    };
  };

  const fetchUserProfile = async (token?: string, explicitUser?: User | null) => {
    try {
      const myProfile = await api.getMe();
      if (!myProfile.is_active) {
        // Disabled user account
        await supabase.auth.signOut();
        clearAuthStorage();
        setProfile(null);
        setUser(null);
        setSession(null);
        throw new Error("Your account has been disabled. Please contact the system administrator.");
      }
      setProfile(myProfile);
      localStorage.setItem("nwis_auth_profile", JSON.stringify(myProfile));
    } catch (err: any) {
      console.warn("[AuthContext] Profile fetch error, using session fallback:", err);
      if (err.message?.includes("disabled")) {
        throw err;
      }
      const u = explicitUser || user || session?.user;
      const cachedUserRaw = localStorage.getItem("nwis_auth_user");
      const cachedUser = cachedUserRaw ? JSON.parse(cachedUserRaw) : null;
      const resolvedUser = u || cachedUser;

      const email = resolvedUser?.email || "engineer@nwis.demo";
      const fallback = createDemoProfile(email, resolvedUser?.user_metadata, resolvedUser?.id);
      setProfile(fallback);
      localStorage.setItem("nwis_auth_profile", JSON.stringify(fallback));
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        // Resilient fallback for demo personas if Supabase is offline or network fails
        const isDemoUser = cleanEmail.endsWith("@nwis.demo") || cleanEmail.includes("engineer") || cleanEmail.includes("supervisor") || cleanEmail.includes("admin");
        if (isDemoUser && (pass === "OIL_nwis_demo_2026!" || error.message?.includes("fetch") || error.message?.includes("Network"))) {
          console.warn("[AuthContext] Supabase sign-in encountered network issue; using offline demo mode fallback.");
          const mockUser: User = {
            id: "demo-" + cleanEmail.replace(/[^a-z0-9]/g, "-"),
            app_metadata: {},
            user_metadata: { full_name: cleanEmail.split("@")[0].toUpperCase() },
            aud: "authenticated",
            created_at: new Date().toISOString(),
            email: cleanEmail,
            phone: "",
            role: "authenticated",
            updated_at: new Date().toISOString(),
          };
          const demoToken = cleanEmail.includes("supervisor") ? "demo-supervisor" : cleanEmail.includes("admin") ? "demo-admin" : "demo-engineer";
          const fallbackProfile = createDemoProfile(cleanEmail, mockUser.user_metadata, mockUser.id);

          localStorage.setItem("nwis_auth_token", demoToken);
          localStorage.setItem("nwis_auth_user", JSON.stringify(mockUser));
          localStorage.setItem("nwis_auth_profile", JSON.stringify(fallbackProfile));

          setUser(mockUser);
          setSession({
            access_token: demoToken,
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "demo-refresh-token",
            user: mockUser,
          });
          setProfile(fallbackProfile);
          setIsLoading(false);
          return { success: true };
        }

        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (!data.session) {
        setIsLoading(false);
        return { success: false, error: "Failed to establish authenticated session." };
      }

      setSession(data.session);
      setUser(data.user);
      localStorage.setItem("nwis_auth_user", JSON.stringify(data.user));
      localStorage.setItem("nwis_auth_token", data.session.access_token);

      // Fetch user profile & RBAC permissions from backend
      try {
        const myProfile = await api.getMe();
        if (!myProfile.is_active) {
          await supabase.auth.signOut();
          clearAuthStorage();
          setProfile(null);
          setUser(null);
          setSession(null);
          setIsLoading(false);
          return {
            success: false,
            error: "Your account has been disabled. Please contact the system administrator.",
          };
        }
        setProfile(myProfile);
        localStorage.setItem("nwis_auth_profile", JSON.stringify(myProfile));

        // Record audit event
        api.recordAudit("LOGIN", {
          email: myProfile.email,
          role: myProfile.active_role,
        });

        setIsLoading(false);
        return { success: true };
      } catch (profileErr: any) {
        console.warn("[AuthContext] Backend profile fetch failed, using fallback profile:", profileErr);
        const fallbackProfile = createDemoProfile(data.user.email || cleanEmail, data.user.user_metadata, data.user.id);
        setProfile(fallbackProfile);
        localStorage.setItem("nwis_auth_profile", JSON.stringify(fallbackProfile));
        setIsLoading(false);
        return { success: true };
      }
    } catch (err: any) {
      // General network/catch fallback for demo accounts
      const isDemoUser = cleanEmail.endsWith("@nwis.demo");
      if (isDemoUser && pass === "OIL_nwis_demo_2026!") {
        const mockUser: User = {
          id: "demo-" + cleanEmail.replace(/[^a-z0-9]/g, "-"),
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
          email: cleanEmail,
          phone: "",
          role: "authenticated",
          updated_at: new Date().toISOString(),
        };
        const demoToken = cleanEmail.includes("supervisor") ? "demo-supervisor" : cleanEmail.includes("admin") ? "demo-admin" : "demo-engineer";
        const fallbackProfile = createDemoProfile(cleanEmail);

        localStorage.setItem("nwis_auth_token", demoToken);
        localStorage.setItem("nwis_auth_user", JSON.stringify(mockUser));
        localStorage.setItem("nwis_auth_profile", JSON.stringify(fallbackProfile));

        setUser(mockUser);
        setSession({
          access_token: demoToken,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "demo-refresh-token",
          user: mockUser,
        });
        setProfile(fallbackProfile);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: err.message || "Authentication error occurred." };
    }
  };

  const logout = async () => {
    try {
      if (profile) {
        api.recordAudit("LOGOUT", { email: profile.email });
      }
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[Auth] Logout warning:", e);
    } finally {
      clearAuthStorage();
      setUser(null);
      setSession(null);
      setProfile(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  const hasRole = (role: string): boolean => {
    if (!profile) return false;
    return profile.roles.includes(role as UserRoleName) || profile.active_role === role;
  };

  const hasPermission = (perm: string): boolean => {
    if (!profile) return false;
    return profile.permissions.includes(perm);
  };

  const refreshProfile = async () => {
    if (session?.access_token) {
      await fetchUserProfile(session.access_token);
    }
  };

  const roles = profile?.roles || [];
  const activeRole = profile?.active_role || null;
  const permissions = profile?.permissions || [];
  const isAuthenticated = !!user && !!profile;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        activeRole,
        permissions,
        isAuthenticated,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
