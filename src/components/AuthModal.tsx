import React, {
  useEffect,
  useState,
} from "react";

import {
  Lock,
  Mail,
  X,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import type {
  UserAccount,
} from "../types";

import {
  authService,
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

const isValidEmail = (
  value: string,
): boolean => {
  const email =
    value.trim();

  if (
    email.length < 6 ||
    email.length > 254
  ) {
    return false;
  }

  const parts =
    email.split("@");

  if (
    parts.length !== 2
  ) {
    return false;
  }

  const [
    localPart,
    domain,
  ] = parts;

  if (
    !localPart ||
    !domain
  ) {
    return false;
  }

  if (
    localPart.length > 64 ||
    domain.length > 253
  ) {
    return false;
  }

  if (
    localPart.startsWith(
      ".",
    ) ||
    localPart.endsWith(
      ".",
    ) ||
    localPart.includes(
      "..",
    )
  ) {
    return false;
  }

  if (
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(
      localPart,
    )
  ) {
    return false;
  }

  if (
    !domain.includes(".")
  ) {
    return false;
  }

  if (
    domain.startsWith(
      ".",
    ) ||
    domain.endsWith(
      ".",
    ) ||
    domain.startsWith(
      "-",
    ) ||
    domain.endsWith(
      "-",
    ) ||
    domain.includes(
      "..",
    )
  ) {
    return false;
  }

  const domainLabels =
    domain.split(".");

  if (
    domainLabels.some(
      (label) =>
        label.length ===
          0 ||
        label.length > 63 ||
        label.startsWith(
          "-",
        ) ||
        label.endsWith(
          "-",
        ) ||
        !/^[A-Za-z0-9-]+$/.test(
          label,
        ),
    )
  ) {
    return false;
  }

  const topLevelDomain =
    domainLabels[
      domainLabels.length -
        1
    ];

  if (
    !/^[A-Za-z]{2,63}$/.test(
      topLevelDomain,
    )
  ) {
    return false;
  }

  return true;
};

export const AuthModal: React.FC<
  AuthModalProps
> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  initialMode = "login",
}) => {
  const [
    authMode,
    setAuthMode,
  ] = useState<AuthMode>(
    initialMode === "signup"
      ? "login"
      : initialMode,
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
    resetEmail,
    setResetEmail,
  ] = useState("");

  const [
    loginError,
    setLoginError,
  ] = useState("");

  const [
    resetError,
    setResetError,
  ] = useState("");

  const [
    resetMessage,
    setResetMessage,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    /*
     * Public registration is intentionally disabled.
     *
     * If any older part of the application attempts
     * to open the modal in "signup" mode, we safely
     * redirect it to the login screen.
     */
    setAuthMode(
      initialMode === "signup"
        ? "login"
        : initialMode,
    );

    setLoginError("");
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

  const handleLoginSubmit =
    async (
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

  const handlePasswordResetRequest =
    async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setResetError("");
      setResetMessage("");

      if (
        !isValidEmail(
          resetEmail,
        )
      ) {
        setResetError(
          "Please enter a valid email address.",
        );
        return;
      }

      /*
       * Password reset remains deliberately
       * disabled until the secure server-side
       * reset mechanism is implemented.
       */
      setResetError(
        "Password reset is not yet enabled on the server. Your account remains unchanged.",
      );
    };

  const switchMode = (
    mode: AuthMode,
  ) => {
    setAuthMode(mode);

    setLoginError("");
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
                  "forgot" &&
                  "Password recovery"}
              </p>
            </div>
          </div>

          {/* Authentication tabs */}
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
                  "forgot",
                )
              }
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode ===
                "forgot"
                  ? "bg-white text-[#22577A] shadow-sm"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              Password Help
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
                        event.target.value,
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
                        event.target.value,
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

              {/* Organization-managed access notice */}
              <div className="rounded-xl border border-[#22577A]/15 bg-[#22577A]/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#22577A]/10">
                    <UserPlus className="h-4 w-4 text-[#22577A]" />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Need an account?
                    </p>

                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      PharmaTrack accounts are
                      managed by your pharmacy or
                      clinic administrator. Ask
                      your administrator to invite
                      you to the system.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-500">
                  Authentication is handled
                  securely by the PharmaTrack
                  server.
                </p>
              </div>
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
                      event.target.value,
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

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] leading-relaxed text-slate-500 text-center">
                  If you cannot access your
                  account, contact your pharmacy or
                  clinic administrator for assistance.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;