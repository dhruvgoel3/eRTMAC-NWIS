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

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

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

  // If already logged in, redirect to requested page or root
  const rawFrom = (location.state as any)?.from?.pathname;
  const targetDestination = rawFrom && rawFrom !== "/login" ? rawFrom : "/";

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(targetDestination, { replace: true });
    }
  }, [isAuthenticated, navigate, targetDestination]);

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
      navigate(targetDestination, { replace: true });
    } else {
      setErrorMessage(result.error || "Authentication failed. Please verify credentials.");
    }
  };

  // Quick Demo Account selection helper
  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("OIL_nwis_demo_2026!");
    setErrorMessage(null);
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
      {/* Top Status Strip */}
      <div className="auth-top-strip">
        <div className="status-badge">
          <span className="pulse-dot" />
          <span style={{ letterSpacing: "0.08em", fontWeight: 700, color: "var(--color-mint-pulse)" }}>
            REAL-TIME OPERATIONS CONTROL ROOM
          </span>
          <span style={{ opacity: 0.35 }}>|</span>
          <span style={{ opacity: 0.85 }}>Nearby Wells Intelligence System</span>
        </div>
        <div style={{ letterSpacing: "0.08em", fontWeight: 700 }}>OIL INDIA LIMITED</div>
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

              {/* Quick Demo Persona Switcher */}
              <div className="auth-demo-card">
                <div className="auth-demo-title">
                  <span>Quick Sign-In · Select Demo Persona</span>
                  <span className="auth-badge-role">1-Click</span>
                </div>
                <div className="auth-demo-grid">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo("engineer@nwis.demo")}
                    className="auth-demo-btn"
                  >
                    <div>
                      <div className="auth-demo-role-name">Drilling Engineer</div>
                      <div className="auth-demo-role-sub">engineer@nwis.demo</div>
                    </div>
                    <span className="auth-badge-role">Primary User</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo("supervisor@nwis.demo")}
                    className="auth-demo-btn"
                  >
                    <div>
                      <div className="auth-demo-role-name">Drilling Supervisor</div>
                      <div className="auth-demo-role-sub">supervisor@nwis.demo</div>
                    </div>
                    <span className="auth-badge-role">Oversight & Escalate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo("admin@nwis.demo")}
                    className="auth-demo-btn"
                  >
                    <div>
                      <div className="auth-demo-role-name">Knowledge Admin</div>
                      <div className="auth-demo-role-sub">admin@nwis.demo</div>
                    </div>
                    <span className="auth-badge-role">User & RBAC Admin</span>
                  </button>
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
                        <option value="KNOWLEDGE_ADMIN">Knowledge Administrator (RBAC & Ingestion Admin)</option>
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
