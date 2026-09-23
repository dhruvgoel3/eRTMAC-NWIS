import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Lock, Mail, AlertTriangle, ArrowRight, Radio, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>("");
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // If already logged in, redirect to requested page or root
  const from = (location.state as any)?.from?.pathname || "/";
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

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
      navigate(from, { replace: true });
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
    <div className="min-h-screen bg-[#f3f1ec] flex flex-col justify-between text-[#104336]">
      {/* Top Demo Environment Banner */}
      <div className="bg-[#104336] text-white px-4 py-2 flex items-center justify-between text-xs font-mono border-b border-[#0fff87]/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0fff87] animate-pulse" />
          <span className="tracking-wider uppercase font-semibold text-[#0fff87]">
            DEMO ENVIRONMENT — Synthetic Data
          </span>
          <span className="hidden sm:inline text-white/50">|</span>
          <span className="hidden sm:inline text-white/70">
            SIH Problem Statement 121 Prototype
          </span>
        </div>
        <div className="text-white/60 tracking-wider">OIL INDIA LIMITED</div>
      </div>

      {/* Main Login Frame */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#104336]/10 p-8 sm:p-10 shadow-sm">
          {/* Header & Wordmark */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#104336] text-[#0fff87] mb-4 shadow-sm">
              <Radio className="w-7 h-7" />
            </div>

            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#104336]">
                NWIS
              </h1>
              <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#104336]/10 text-[#104336]">
                v1.0-SIH
              </span>
            </div>

            <h2 className="text-sm font-semibold tracking-wide text-[#104336]/80 uppercase mb-2">
              Nearby Wells Intelligence System
            </h2>

            <p className="text-xs text-[#104336]/60 leading-relaxed max-w-xs mx-auto">
              AI-Powered Offset Well Knowledge & Decision Support for Drilling Operations
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#104336]/80 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#104336]/40">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@nwis.demo"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-sm text-[#104336] placeholder-[#104336]/30 focus:outline-none focus:border-[#104336] focus:bg-white transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#104336]/80 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setResetEmail(email);
                    setResetSuccess(false);
                    setResetError(null);
                  }}
                  className="text-xs text-[#104336]/60 hover:text-[#104336] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#104336]/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-sm text-[#104336] placeholder-[#104336]/30 focus:outline-none focus:border-[#104336] focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#104336] hover:bg-[#0c3329] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 mt-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-[#0fff87] rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-[#0fff87]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Persona Switcher */}
          <div className="mt-8 pt-6 border-t border-[#104336]/10">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#104336]/60 mb-3 text-center">
              Quick Sign-In · Select Demo Persona
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("engineer@nwis.demo")}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#104336]/15 hover:border-[#104336] hover:bg-[#f3f1ec]/60 transition-all text-left group"
              >
                <div>
                  <div className="text-xs font-bold text-[#104336] group-hover:text-[#104336]">
                    Drilling Engineer
                  </div>
                  <div className="text-[11px] font-mono text-[#104336]/60">
                    engineer@nwis.demo
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#104336]/10 text-[#104336] font-semibold">
                  Primary User
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("supervisor@nwis.demo")}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#104336]/15 hover:border-[#104336] hover:bg-[#f3f1ec]/60 transition-all text-left group"
              >
                <div>
                  <div className="text-xs font-bold text-[#104336] group-hover:text-[#104336]">
                    Drilling Supervisor
                  </div>
                  <div className="text-[11px] font-mono text-[#104336]/60">
                    supervisor@nwis.demo
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#104336]/10 text-[#104336] font-semibold">
                  Oversight & Escalate
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("admin@nwis.demo")}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[#104336]/15 hover:border-[#104336] hover:bg-[#f3f1ec]/60 transition-all text-left group"
              >
                <div>
                  <div className="text-xs font-bold text-[#104336] group-hover:text-[#104336]">
                    Knowledge Admin
                  </div>
                  <div className="text-[11px] font-mono text-[#104336]/60">
                    admin@nwis.demo
                  </div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#104336]/10 text-[#104336] font-semibold">
                  User & RBAC Admin
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#104336]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#104336]/10 p-6 max-w-md w-full shadow-lg">
            <h3 className="text-lg font-bold text-[#104336] mb-1">
              Reset Access Credentials
            </h3>
            <p className="text-xs text-[#104336]/70 mb-4">
              Enter your registered work email to receive a password recovery verification link.
            </p>

            {resetSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs mb-4 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  Password reset link sent! Check your inbox to set new credentials.
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                {resetError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {resetError}
                  </div>
                )}
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="your.email@nwis.demo"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#f3f1ec]/50 border border-[#104336]/20 rounded-xl text-xs font-mono focus:outline-none focus:border-[#104336]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#104336] text-white font-medium text-xs hover:bg-[#0c3329] transition-all"
                >
                  Send Recovery Link
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="mt-4 w-full py-2 text-xs text-[#104336]/60 hover:text-[#104336]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="py-4 text-center text-xs font-mono text-[#104336]/50">
        Oil India Limited (OIL) · eRTMAC-NWIS · Confidential Operations Platform
      </div>
    </div>
  );
};
