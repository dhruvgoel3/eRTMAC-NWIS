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

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          if (mounted) {
            setSession(data.session);
            setUser(data.session.user);
          }
          await fetchUserProfile(data.session.access_token);
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
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (event === "SIGNED_IN" && currentSession) {
          await fetchUserProfile(currentSession.access_token);
        } else if (event === "SIGNED_OUT") {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (token?: string) => {
    try {
      const myProfile = await api.getMe();
      if (!myProfile.is_active) {
        // Disabled user account
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
        throw new Error("Your account has been disabled. Please contact the system administrator.");
      }
      setProfile(myProfile);
    } catch (err: any) {
      console.error("[AuthContext] Profile fetch error:", err);
      if (err.message?.includes("disabled")) {
        throw err;
      }
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: pass,
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (!data.session) {
        setIsLoading(false);
        return { success: false, error: "Failed to establish authenticated session." };
      }

      setSession(data.session);
      setUser(data.user);

      // Fetch user profile & RBAC permissions from backend
      try {
        const myProfile = await api.getMe();
        if (!myProfile.is_active) {
          await supabase.auth.signOut();
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

        // Record audit event
        api.recordAudit("LOGIN", {
          email: myProfile.email,
          role: myProfile.active_role,
        });

        setIsLoading(false);
        return { success: true };
      } catch (profileErr: any) {
        setIsLoading(false);
        return {
          success: false,
          error: profileErr.message || "Failed to load user permissions.",
        };
      }
    } catch (err: any) {
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
