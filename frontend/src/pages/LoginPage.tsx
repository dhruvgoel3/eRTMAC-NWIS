import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Shield,
  Lock,
  Mail,
  AlertTriangle,
  ArrowRight,
  Radio,
  CheckCircle2,
  User,
  Building,
  Briefcase,
  BadgeAlert,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { api } from "../services/api";

export const LoginPage: React.FC = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, profile, activeRole } = useAuth();

  // Tab mode: 'signin' | 'signup'
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Sign In state
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sign Up state
  const [signupFullName, setSignupFullName] = useState<string>("");
  const [signupEmail, setSignupEmail] = useState<string>("");
  const [signupEmployeeId, setSignupEmployeeId] = useState<string>("");
  const [signupDepartment, setSignupDepartment] = useState<string>("Drilling Operations");
  const [signupDesignation, setSignupDesignation] = useState<string>("Drilling Engineer");
  const [signupRole, setSignupRole] = useState<string>("DRILLING_ENGINEER");
  const [signupPassword, setSignupPassword] = useState<string>("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState<string>("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<boolean>(false);

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>("");
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Helper to resolve dashboard routing based on actual user role
  const resolveTargetDestination = (role?: string | null, rawPath?: string): string => {
    // Explicitly prevent users from getting routed to student dashboard
    if (!rawPath || rawPath === "/login" || rawPath === "/" || rawPath === "/student") {
      if (role === "KNOWLEDGE_ADMIN") {
        return "/admin/users";
      }
      return "/dashboard";
    }
    return rawPath;
  };

  const rawFrom = (location.state as any)?.from?.pathname;

  React.useEffect(() => {
    if (isAuthenticated) {
      const destination = resolveTargetDestination(profile?.active_role || activeRole, rawFrom);
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, rawFrom, profile, activeRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      // Determine destination based on authenticated profile
      const storedProfileRaw = localStorage.getItem("nwis_auth_profile");
      let currentRole = profile?.active_role || activeRole;
      if (!currentRole && storedProfileRaw) {
        try {
          const parsed = JSON.parse(storedProfileRaw);
          currentRole = parsed.active_role || (parsed.roles && parsed.roles[0]);
        } catch {
          // ignore
        }
      }
      const destination = resolveTargetDestination(currentRole, rawFrom);
      navigate(destination, { replace: true });
    } else {
      setErrorMessage(result.error || "Authentication failed. Please verify credentials.");
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupSuccess(false);

    if (!signupEmail || !signupPassword) {
      setSignupError("Email and password are required.");
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        options: {
          data: {
            full_name: signupFullName.trim(),
            employee_id: signupEmployeeId.trim() || undefined,
            department: signupDepartment.trim(),
            designation: signupDesignation.trim(),
            role_request: signupRole,
          },
        },
      });

      if (error) {
        setSignupError(error.message);
      } else {
        // Ensure profile exists in NWIS database
        try {
          await api.registerUser({
            email: signupEmail.trim().toLowerCase(),
            full_name: signupFullName.trim(),
            employee_id: signupEmployeeId.trim() || undefined,
            department: signupDepartment.trim(),
            designation: signupDesignation.trim(),
            role: signupRole,
            auth_user_id: data?.user?.id,
          });
        } catch (regErr) {
          console.warn("Backend register notification:", regErr);
        }

        setSignupSuccess(true);
        // Pre-populate sign-in fields
        setEmail(signupEmail);
        setPassword(signupPassword);
      }
    } catch (err: any) {
      setSignupError(err.message || "Failed to register account.");
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetEmail) {
      setResetError("Please enter your registered work email.");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setResetError(error.message);
      } else {
        setResetSuccess(true);
      }
    } catch (err: any) {
      setResetError(err.message || "Failed to initiate password reset.");
    }
  };

  return (
    <div className="auth-viewport">
      {/* Top Header Strip */}
      <div className="auth-top-strip" style={{ opacity: 0.85, fontSize: 11 }}>
        <div className="status-badge">
          <span className="pulse-dot" />
          <span style={{ letterSpacing: "0.05em", fontWeight: 600, color: "var(--color-mint-pulse)" }}>
            eRTMAC-NWIS · REAL-TIME OPERATIONS
          </span>
          <span style={{ opacity: 0.35 }}>|</span>
          <span style={{ opacity: 0.85 }}>Nearby Wells Intelligence & Decision Support System</span>
        </div>
        <div style={{ letterSpacing: "0.06em", fontWeight: 600, fontSize: 10 }}>OIL INDIA LIMITED</div>
      </div>


      {/* Main Login Frame */}
      <div className="auth-main-area">
        <div className={`auth-card ${mode === "signup" ? "auth-card-wide" : ""}`}>
          {/* Header & Wordmark */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div className="auth-logo-badge">
              <Radio style={{ width: 28, height: 28 }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
              <h1 className="auth-title" style={{ margin: 0 }}>NWIS</h1>
              <span className="auth-badge-role">v1.0-SIH</span>
            </div>

            <h2 style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", color: "var(--color-bark)", textTransform: "uppercase", marginBottom: 6 }}>
              Nearby Wells Intelligence System
            </h2>

            <p className="auth-subtitle" style={{ maxWidth: 360, margin: "0 auto" }}>
              AI-Powered Offset Well Knowledge & Decision Support for Drilling Operations
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="auth-tabs-nav">
            <button
              type="button"
              className={`auth-tab-toggle ${mode === "signin" ? "active" : ""}`}
              onClick={() => {
                setMode("signin");
                setErrorMessage(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-toggle ${mode === "signup" ? "active" : ""}`}
              onClick={() => {
                setMode("signup");
                setSignupError(null);
              }}
            >
              Sign Up / Register Work Account
            </button>
          </div>

          {/* SIGN IN VIEW */}
          {mode === "signin" && (
            <>
              {errorMessage && (
                <div className="auth-alert-error">
                  <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">Work Email</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <Mail style={{ width: 16, height: 16 }} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@nwis.demo"
                      required
                      className="auth-input"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="auth-label">Password</label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotModalOpen(true);
                        setResetEmail(email);
                        setResetSuccess(false);
                        setResetError(null);
                      }}
                      className="auth-link-btn"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <Lock style={{ width: 16, height: 16 }} />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="auth-input"
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="auth-btn-submit"
                >
                  {isSubmitting ? (
                    <>
                      <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight style={{ width: 16, height: 16, color: "var(--color-mint-pulse)" }} />
                    </>
                  )}
                </button>
              </form>

              {/* Authorized Test Accounts Reference */}
              <div
                style={{
                  marginTop: 20,
                  padding: "16px 20px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12,
                  color: "var(--color-muted-slate)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 10,
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--color-slate-light)",
                  }}
                >
                  <span>Authorized Test Roles</span>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>Default Password: OIL_nwis_demo_2026!</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--color-pearl)" }}>Drilling Engineer: </span>
                    <span style={{ fontFamily: "monospace", fontSize: 11 }}>engineer@nwis.demo</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--color-pearl)" }}>Drilling Supervisor: </span>
                    <span style={{ fontFamily: "monospace", fontSize: 11 }}>supervisor@nwis.demo</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--color-pearl)" }}>Knowledge Admin: </span>
                    <span style={{ fontFamily: "monospace", fontSize: 11 }}>admin@nwis.demo</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--color-pearl)" }}>Disabled Account: </span>
                    <span style={{ fontFamily: "monospace", fontSize: 11 }}>disabled_operator@nwis.demo</span>
                  </div>
                </div>
              </div>
            </>

          )}

          {/* SIGN UP VIEW */}
          {mode === "signup" && (
            <>
              {signupSuccess ? (
                <div>
                  <div className="auth-alert-success" style={{ marginBottom: 20 }}>
                    <CheckCircle2 style={{ width: 20, height: 20, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>Account Registered Successfully!</div>
                      <div>
                        Your OIL eRTMAC operator account has been provisioned. You can now authenticate immediately.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="auth-btn-submit"
                    onClick={() => setMode("signin")}
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight style={{ width: 16, height: 16, color: "var(--color-mint-pulse)" }} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSignUpSubmit} className="auth-form">
                  {signupError && (
                    <div className="auth-alert-error">
                      <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
                      <span>{signupError}</span>
                    </div>
                  )}

                  <div className="auth-form-row">
                    <div className="auth-field">
                      <label className="auth-label">Full Name</label>
                      <div className="auth-input-wrapper">
                        <div className="auth-input-icon">
                          <User style={{ width: 15, height: 15 }} />
                        </div>
                        <input
                          type="text"
                          value={signupFullName}
                          onChange={(e) => setSignupFullName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          required
                          className="auth-input"
                        />
                      </div>
                    </div>

                    <div className="auth-field">
                      <label className="auth-label">Employee ID</label>
                      <div className="auth-input-wrapper">
                        <div className="auth-input-icon">
                          <BadgeAlert style={{ width: 15, height: 15 }} />
                        </div>
                        <input
                          type="text"
                          value={signupEmployeeId}
                          onChange={(e) => setSignupEmployeeId(e.target.value)}
                          placeholder="e.g. OIL-ENG-4902"
                          className="auth-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Official Work Email</label>
                    <div className="auth-input-wrapper">
                      <div className="auth-input-icon">
                        <Mail style={{ width: 15, height: 15 }} />
                      </div>
                      <input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="operator@oilindia.in"
                        required
                        className="auth-input"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="auth-form-row">
                    <div className="auth-field">
                      <label className="auth-label">Department</label>
                      <div className="auth-input-wrapper">
                        <div className="auth-input-icon">
                          <Building style={{ width: 15, height: 15 }} />
                        </div>
                        <input
                          type="text"
                          value={signupDepartment}
                          onChange={(e) => setSignupDepartment(e.target.value)}
                          placeholder="Drilling Operations"
                          required
                          className="auth-input"
                        />
                      </div>
                    </div>

                    <div className="auth-field">
                      <label className="auth-label">Designation</label>
                      <div className="auth-input-wrapper">
                        <div className="auth-input-icon">
                          <Briefcase style={{ width: 15, height: 15 }} />
                        </div>
                        <input
                          type="text"
                          value={signupDesignation}
                          onChange={(e) => setSignupDesignation(e.target.value)}
                          placeholder="Senior Drilling Engineer"
                          required
                          className="auth-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="auth-field">
                    <label className="auth-label">Requested Operational Role</label>
                    <div className="auth-input-wrapper">
                      <div className="auth-input-icon">
                        <Shield style={{ width: 15, height: 15 }} />
                      </div>
                      <select
                        value={signupRole}
                        onChange={(e) => setSignupRole(e.target.value)}
                        className="auth-select"
                      >
                        <option value="DRILLING_ENGINEER">Drilling Engineer (Operational View & Risk Analysis)</option>
                        <option value="DRILLING_SUPERVISOR">Drilling Supervisor (Supervisory & Escalations)</option>
                      </select>

                    </div>
                  </div>

                  <div className="auth-form-row">
                    <div className="auth-field">
                      <label className="auth-label">Password</label>
                      <div className="auth-input-wrapper">
                        <div className="auth-input-icon">
                          <Lock style={{ width: 15, height: 15 }} />
                        </div>
                        <input
                          type="password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          required
                          className="auth-input"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    <div className="auth-field">
                      <label className="auth-label">Confirm Password</label>
                      <div className="auth-input-wrapper">
                        <div className="auth-input-icon">
                          <Lock style={{ width: 15, height: 15 }} />
                        </div>
                        <input
                          type="password"
                          value={signupConfirmPassword}
                          onChange={(e) => setSignupConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          required
                          className="auth-input"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="auth-btn-submit"
                    style={{ marginTop: 8 }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        <span>Registering Operator Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Register Work Account</span>
                        <ArrowRight style={{ width: 16, height: 16, color: "var(--color-mint-pulse)" }} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="auth-modal-backdrop">
          <div className="auth-modal-dialog">
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>
              Reset Access Credentials
            </h3>
            <p style={{ fontSize: "12.5px", color: "var(--color-slate)", marginBottom: 16, lineHeight: 1.5 }}>
              Enter your registered work email to receive a password recovery verification link.
            </p>

            {resetSuccess ? (
              <div className="auth-alert-success" style={{ marginBottom: 16 }}>
                <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>Password reset link sent! Check your inbox to set new credentials.</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {resetError && (
                  <div className="auth-alert-error" style={{ marginBottom: 4 }}>
                    <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
                    <span>{resetError}</span>
                  </div>
                )}
                <div className="auth-field">
                  <label className="auth-label">Work Email</label>
                  <div className="auth-input-wrapper">
                    <div className="auth-input-icon">
                      <Mail style={{ width: 15, height: 15 }} />
                    </div>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="your.email@nwis.demo"
                      required
                      className="auth-input"
                    />
                  </div>
                </div>
                <button type="submit" className="auth-btn-submit" style={{ height: 40, fontSize: 13 }}>
                  Send Recovery Link
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="auth-link-btn"
              style={{ width: "100%", textAlign: "center", marginTop: 14, display: "block" }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="auth-footer">
        Oil India Limited (OIL) · eRTMAC-NWIS · Confidential Operations Platform · SIH PS-121
      </div>
    </div>
  );
};
