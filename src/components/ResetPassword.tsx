import React, { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { authService } from "../services/auth";

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

function validatePassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`At least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`No more than ${PASSWORD_MAX_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("At least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("At least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("At least one number");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("At least one special character");
  }

  return errors;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const passwordErrors = useMemo(
    () => validatePassword(password),
    [password],
  );

  const passwordIsValid = password.length > 0 && passwordErrors.length === 0;

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const canSubmit =
    Boolean(token) &&
    passwordIsValid &&
    passwordsMatch &&
    !loading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!token) {
      setError(
        "This password reset link is invalid or incomplete. Please request a new password reset link.",
      );
      return;
    }

    if (!passwordIsValid) {
      setError(
        "Please choose a password that meets all of the security requirements.",
      );
      return;
    }

    if (!passwordsMatch) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, password);

      setSuccess(true);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to reset your password. Please request a new reset link and try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/");
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                <CheckCircle2
                  className="h-9 w-9 text-emerald-600"
                  strokeWidth={2}
                />
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Password reset successful
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Your password has been changed successfully. You can now sign
                in using your new password.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoToLogin}
              className="mt-7 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Continue to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
        <div className="w-full">
          <div className="mb-6 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
                <LockKeyhole
                  className="h-8 w-8 text-white"
                  strokeWidth={1.8}
                />
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Reset your password
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
              Create a new secure password for your PharmaTrack account.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
            {!token && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Invalid reset link
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-700">
                    This link is missing the required reset token. Please
                    request a new password reset link.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <p className="text-sm leading-5 text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="reset-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  New password
                </label>

                <div className="relative">
                  <input
                    id="reset-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                    autoComplete="new-password"
                    disabled={loading || !token}
                    placeholder="Enter your new password"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={loading || !token}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label
                  htmlFor="reset-confirm-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Confirm new password
                </label>

                <div className="relative">
                  <input
                    id="reset-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError("");
                    }}
                    autoComplete="new-password"
                    disabled={loading || !token}
                    placeholder="Confirm your new password"
                    className={`w-full rounded-xl border bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                      confirmPassword.length > 0
                        ? passwordsMatch
                          ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-100"
                          : "border-red-300 focus:border-red-500 focus:ring-red-100"
                        : "border-slate-300 focus:border-slate-500 focus:ring-slate-200"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    disabled={loading || !token}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmed password"
                        : "Show confirmed password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="mt-2 text-xs font-medium text-red-600">
                    Passwords do not match.
                  </p>
                )}
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-600" />

                  <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    Password requirements
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <PasswordRequirement
                    valid={password.length >= PASSWORD_MIN_LENGTH}
                    text={`At least ${PASSWORD_MIN_LENGTH} characters`}
                  />

                  <PasswordRequirement
                    valid={password.length <= PASSWORD_MAX_LENGTH}
                    text={`Maximum ${PASSWORD_MAX_LENGTH} characters`}
                  />

                  <PasswordRequirement
                    valid={/[A-Z]/.test(password)}
                    text="Uppercase letter"
                  />

                  <PasswordRequirement
                    valid={/[a-z]/.test(password)}
                    text="Lowercase letter"
                  />

                  <PasswordRequirement
                    valid={/[0-9]/.test(password)}
                    text="Number"
                  />

                  <PasswordRequirement
                    valid={/[^A-Za-z0-9]/.test(password)}
                    text="Special character"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {loading ? "Resetting password..." : "Reset password"}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-5 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </div>

          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            For your security, password reset links expire after a limited
            period and can only be used once.
          </p>
        </div>
      </div>
    </div>
  );
}

function PasswordRequirement({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {valid ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-slate-300" />
      )}

      <span
        className={`text-xs ${
          valid ? "font-medium text-emerald-700" : "text-slate-500"
        }`}
      >
        {text}
      </span>
    </div>
  );
}