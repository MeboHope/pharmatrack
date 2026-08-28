
import React, {
  useEffect,
  useState,
} from "react";

import {
  Lock,
  Mail,
  User,
  X,
  Send,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

import type {
  UserAccount,
} from "../types";

import {
  authService,
  type AuthRole,
} from "../services/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users?: UserAccount[];
  currentUser: UserAccount | null;
  onLoginSuccess: (
    user: UserAccount,
  ) => void;
  onSignUpSuccess: (
    newUser: UserAccount,
  ) => void;
  initialMode?:
    | "login"
    | "signup"
    | "forgot";
}

type AuthMode =
  | "login"
  | "signup"
  | "forgot";

export const AuthModal: React.FC<
  AuthModalProps
> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onSignUpSuccess,
  initialMode = "login",
}) => {
  const [
    authMode,
    setAuthMode,
  ] = useState<AuthMode>(
    initialMode,
  );

  const [
    loginEmail,
    setLoginEmail,
  ] = useState("");

  const [
    loginPassword,
    setLoginPassword,
  ] = useState("");

  const [
    showLoginPassword,
    setShowLoginPassword,
  ] = useState(false);

  const [
    signupName,
    setSignupName,
  ] = useState("");

  const [
    signupEmail,
    setSignupEmail,
  ] = useState("");

  const [
    signupPhone,
    setSignupPhone,
  ] = useState("");

  const [
    signupRole,
    setSignupRole,
  ] = useState<
    "Clinician" |
    "Pharmacist" |
    "Admin"
  >("Pharmacist");

  const [
    signupPassword,
    setSignupPassword,
  ] = useState("");

  const [
    signupConfirmPassword,
    setSignupConfirmPassword,
  ] = useState("");

  const [
    showSignupPassword,
    setShowSignupPassword,
  ] = useState(false);

  const [
    resetEmail,
    setResetEmail,
  ] = useState("");

  const [
    loginError,
    setLoginError,
  ] = useState("");

  const [
    signupError,
    setSignupError,
  ] = useState("");

  const [
    resetError,
    setResetError,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    resetMessage,
    setResetMessage,
  ] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setAuthMode(
      initialMode,
    );

    setLoginError("");
    setSignupError("");
    setResetError("");
    setResetMessage("");
    setIsSubmitting(false);
  }, [
    isOpen,
    initialMode,
  ]);

  if (!isOpen) {
    return null;
  }

  const handleLoginSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setLoginError("");
    setIsSubmitting(true);

    try {
      const user =
        await authService.login(
          loginEmail,
          loginPassword,
        );

      onLoginSuccess(user);
      onClose();

      setLoginPassword("");
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : "Unable to log in. Please check your credentials.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setSignupError("");

    if (
      signupName.trim()
        .length < 2
    ) {
      setSignupError(
        "Please enter your full name.",
      );
      return;
    }

    if (
      !signupEmail
        .trim()
        .includes("@")
    ) {
      setSignupError(
        "Please enter a valid email address.",
      );
      return;
    }

    if (
      signupPassword.length < 8
    ) {
      setSignupError(
        "Password must contain at least 8 characters.",
      );
      return;
    }

    if (
      signupPassword !==
      signupConfirmPassword
    ) {
      setSignupError(
        "Passwords do not match.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const roleMap: Record<
        typeof signupRole,
        AuthRole
      > = {
        Admin: "ADMIN",
        Pharmacist: "PHARMACIST",
        Clinician: "CLINICIAN",
      };

      const user =
        await authService.register({
          name:
            signupName.trim(),
          email:
            signupEmail
              .trim()
              .toLowerCase(),
          phone:
            signupPhone.trim() ||
            undefined,
          password:
            signupPassword,
          role:
            roleMap[signupRole],
        });

      onSignUpSuccess(user);
      onClose();

      setSignupPassword("");
      setSignupConfirmPassword("");
    } catch (error) {
      setSignupError(
        error instanceof Error
          ? error.message
          : "Unable to create the account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetRequest = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setResetError("");
    setResetMessage("");

    /*
     * The old prototype generated an OTP inside the browser.
     * That is not a real password-reset mechanism.
     *
     * We therefore deliberately do not pretend that a reset
     * has occurred until a server-side reset endpoint exists.
     */
    if (
      !resetEmail
        .trim()
        .includes("@")
    ) {
      setResetError(
        "Please enter a valid email address.",
      );
      return;
    }

    setResetError(
      "Password reset is not yet enabled on the server. Your account remains unchanged.",
    );
  };

  const switchMode = (
    mode: AuthMode,
  ) => {
    setAuthMode(mode);

    setLoginError("");
    setSignupError("");
    setResetError("");
    setResetMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative">
        {/* Header */}
        <div className="bg-[#22577A] text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close authentication dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <img
              src="/logo/logo.png"
              alt="PharmaTrack Logo"
              className="w-10 h-10 object-contain shrink-0"
            />

            <div>
              <h2 className="text-xl font-bold tracking-tight">
                PharmaTrack Account
              </h2>

              <p className="text-xs text-white/80 font-medium">
                {authMode ===
                  "login" &&
                  "Log in to access the pharmacy management system"}

                {authMode ===
                  "signup" &&
                  "Create a secure pharmacy account"}

                {authMode ===
                  "forgot" &&
                  "Password recovery"}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-5 bg-black/20 p-1 rounded-xl">
            <button
              type="button"
              onClick={() =>
                switchMode(
                  "login",
                )
              }
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode ===
                "login"
                  ? "bg-white text-[#22577A] shadow-sm"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              Log In
            </button>

            <button
              type="button"
              onClick={() =>
                switchMode(
                  "signup",
                )
              }
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode ===
                "signup"
                  ? "bg-white text-[#22577A] shadow-sm"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {currentUser && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-500">
                Active account:{" "}
              </span>

              <strong className="text-slate-900">
                {currentUser.name}
              </strong>

              <span className="ml-1 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                {currentUser.role}
              </span>
            </div>
          )}

          {/* LOGIN */}
          {authMode ===
            "login" && (
            <form
              onSubmit={
                handleLoginSubmit
              }
              className="space-y-4"
            >
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />

                  <span>
                    {loginError}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="admin@afyalinkpharmacy.co.ke"
                    value={
                      loginEmail
                    }
                    onChange={(
                      event,
                    ) =>
                      setLoginEmail(
                        event
                          .target
                          .value,
                      )
                    }
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      switchMode(
                        "forgot",
                      )
                    }
                    className="text-[11px] font-semibold text-[#22577A] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />

                  <input
                    type={
                      showLoginPassword
                        ? "text"
                        : "password"
                    }
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={
                      loginPassword
                    }
                    onChange={(
                      event,
                    ) =>
                      setLoginPassword(
                        event
                          .target
                          .value,
                      )
                    }
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowLoginPassword(
                        (
                          value,
                        ) =>
                          !value,
                      )
                    }
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showLoginPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting
                  ? "Signing in..."
                  : "Log In"}

                {!isSubmitting && (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>

              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-500">
                  Authentication is handled
                  securely by the PharmaTrack
                  server.
                </p>
              </div>
            </form>
          )}

          {/* SIGN UP */}
          {authMode ===
            "signup" && (
            <form
              onSubmit={
                handleSignupSubmit
              }
              className="space-y-3"
            >
              {signupError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />

                  <span>
                    {signupError}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>

                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />

                  <input
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Full name"
                    value={
                      signupName
                    }
                    onChange={(
                      event,
                    ) =>
                      setSignupName(
                        event
                          .target
                          .value,
                      )
                    }
                    className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />

                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@pharmacy.co.ke"
                    value={
                      signupEmail
                    }
                    onChange={(
                      event,
                    ) =>
                      setSignupEmail(
                        event
                          .target
                          .value,
                      )
                    }
                    className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role *
                  </label>

                  <select
                    value={
                      signupRole
                    }
                    onChange={(
                      event,
                    ) =>
                      setSignupRole(
                        event
                          .target
                          .value as
                          | "Clinician"
                          | "Pharmacist"
                          | "Admin",
                      )
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-none font-medium"
                  >
                    <option value="Pharmacist">
                      Pharmacist
                    </option>

                    <option value="Clinician">
                      Clinician
                    </option>

                    <option value="Admin">
                      Admin
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone
                  </label>

                  <input
                    type="text"
                    autoComplete="tel"
                    placeholder="0712345678"
                    value={
                      signupPhone
                    }
                    onChange={(
                      event,
                    ) =>
                      setSignupPhone(
                        event
                          .target
                          .value,
                      )
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password *
                  </label>

                  <div className="relative">
                    <input
                      type={
                        showSignupPassword
                          ? "text"
                          : "password"
                      }
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      value={
                        signupPassword
                      }
                      onChange={(
                        event,
                      ) =>
                        setSignupPassword(
                          event
                            .target
                            .value,
                        )
                      }
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowSignupPassword(
                          (
                            value,
                          ) =>
                            !value,
                        )
                      }
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showSignupPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password *
                  </label>

                  <input
                    type={
                      showSignupPassword
                        ? "text"
                        : "password"
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={
                      signupConfirmPassword
                    }
                    onChange={(
                      event,
                    ) =>
                      setSignupConfirmPassword(
                        event
                          .target
                          .value,
                      )
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 mt-2"
              >
                <Send className="w-4 h-4" />

                {isSubmitting
                  ? "Creating Account..."
                  : "Create Account"}
              </button>

              <p className="text-[10px] text-slate-400 text-center">
                Your password is securely
                processed by the PharmaTrack
                server and is never stored in
                the browser as plaintext.
              </p>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {authMode ===
            "forgot" && (
            <form
              onSubmit={
                handlePasswordResetRequest
              }
              className="space-y-4"
            >
              {resetError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />

                  <span>
                    {resetError}
                  </span>
                </div>
              )}

              {resetMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
                  {resetMessage}
                </div>
              )}

              <div className="text-center">
                <Lock className="w-8 h-8 mx-auto text-[#22577A] mb-2" />

                <h3 className="font-bold text-slate-900">
                  Reset Password
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  Enter your account email to
                  begin password recovery.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Email
                </label>

                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={
                    resetEmail
                  }
                  onChange={(
                    event,
                  ) =>
                    setResetEmail(
                      event
                        .target
                        .value,
                    )
                  }
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-sm transition-colors"
              >
                Request Password Reset
              </button>

              <button
                type="button"
                onClick={() =>
                  switchMode(
                    "login",
                  )
                }
                className="w-full text-xs font-semibold text-[#22577A] hover:underline"
              >
                ← Back to Log In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
