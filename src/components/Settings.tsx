import React, {
  useEffect,
  useState,
} from "react";

import {
  Save,
  Loader2,
  Settings as SettingsIcon,
  Building2,
  Phone,
  Mail,
  MapPin,
  UserRound,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";

import type {
  PharmacySettings,
  UserAccount,
} from "../types";

import {
  getPharmacySettings,
  updatePharmacySettings,
  type PharmacySettingsData,
} from "../services/settings";

import accountService from "../services/account";

interface SettingsProps {
  settings: PharmacySettings;
  onSaveSettings: (
    settings: PharmacySettings,
  ) => void;
  currentUser: UserAccount;
  users: UserAccount[];
  onUpdateUserPassword: (
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  onOpenAuthModal: () => void;
}

const toFormSettings = (
  settings: PharmacySettings,
): PharmacySettingsData => ({
  pharmacyName:
    settings.pharmacyName || "",
  tagline:
    settings.tagline || "",
  address:
    settings.address || "",
  phone:
    settings.phone || "",
  email:
    settings.email || "",
  currency:
    settings.currency || "KES",
  clinicianName:
    settings.clinicianName || "",
  expiryAlertDays:
    Number(settings.expiryAlertDays) || 90,
  reorderAlertLevel:
    Number(settings.reorderAlertLevel) || 10,
  logoUrl:
    settings.logoUrl ||
    "/logo/logo.png",
});

export const Settings: React.FC<
  SettingsProps
> = ({
  settings,
  onSaveSettings,
  currentUser,
}) => {
  const [form, setForm] =
    useState<PharmacySettingsData>(
      toFormSettings(settings),
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [isChangingPassword, setIsChangingPassword] =
    useState(false);

  const [passwordError, setPasswordError] =
    useState("");

  const [passwordSuccess, setPasswordSuccess] =
    useState("");

  const canEdit =
    currentUser.role === "Admin" ||
    currentUser.role === "Pharmacist";

  useEffect(() => {
    let mounted = true;

    const loadSettings =
      async () => {
        try {
          setIsLoading(true);
          setError("");

          const remoteSettings =
            await getPharmacySettings();

          if (!mounted) {
            return;
          }

          setForm(
            toFormSettings(
              remoteSettings,
            ),
          );
        } catch (requestError) {
          if (!mounted) {
            return;
          }

          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load pharmacy settings.",
          );
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = <
    K extends keyof PharmacySettingsData
  >(
    field: K,
    value: PharmacySettingsData[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSave =
    async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (!canEdit) {
        setError(
          "You do not have permission to modify pharmacy settings.",
        );
        return;
      }

      try {
        setIsSaving(true);
        setError("");
        setSuccessMessage("");

        const saved =
          await updatePharmacySettings(
            form,
          );

        const normalized =
          toFormSettings(saved);

        setForm(normalized);

        onSaveSettings({
          pharmacyName:
            normalized.pharmacyName,
          tagline:
            normalized.tagline,
          address:
            normalized.address,
          phone:
            normalized.phone,
          email:
            normalized.email,
          currency:
            normalized.currency,
          clinicianName:
            normalized.clinicianName,
          expiryAlertDays:
            normalized.expiryAlertDays,
          reorderAlertLevel:
            normalized.reorderAlertLevel,
          logoUrl:
            normalized.logoUrl,
        });

        setSuccessMessage(
          "Pharmacy settings saved successfully.",
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to save pharmacy settings.",
        );
      } finally {
        setIsSaving(false);
      }
    };

  const handleChangePassword =
    async (
      event: React.FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setPasswordError("");
      setPasswordSuccess("");

      if (!currentPassword) {
        setPasswordError(
          "Current password is required.",
        );
        return;
      }

      if (!newPassword) {
        setPasswordError(
          "New password is required.",
        );
        return;
      }

      if (newPassword.length < 8) {
        setPasswordError(
          "New password must contain at least 8 characters.",
        );
        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        setPasswordError(
          "The new passwords do not match.",
        );
        return;
      }

      if (
        currentPassword ===
        newPassword
      ) {
        setPasswordError(
          "The new password must be different from the current password.",
        );
        return;
      }

      try {
        setIsChangingPassword(true);

        await accountService.changePassword(
          currentPassword,
          newPassword,
        );

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        setPasswordSuccess(
          "Password changed successfully.",
        );
      } catch (requestError) {
        setPasswordError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to change password.",
        );
      } finally {
        setIsChangingPassword(false);
      }
    };

  if (isLoading) {
    return (
      <section className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading pharmacy settings...
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#22577A] p-2.5 text-white">
              <SettingsIcon className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Pharmacy Settings
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage pharmacy information, inventory alerts, and your account security.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="space-y-6"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#22577A]" />

              <h2 className="font-bold text-slate-900">
                Pharmacy Information
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Pharmacy Name
                </label>

                <input
                  type="text"
                  value={form.pharmacyName}
                  onChange={(event) =>
                    updateField(
                      "pharmacyName",
                      event.target.value,
                    )
                  }
                  disabled={!canEdit}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Tagline
                </label>

                <input
                  type="text"
                  value={form.tagline}
                  onChange={(event) =>
                    updateField(
                      "tagline",
                      event.target.value,
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <MapPin className="h-3.5 w-3.5" />
                  Address
                </label>

                <input
                  type="text"
                  value={form.address}
                  onChange={(event) =>
                    updateField(
                      "address",
                      event.target.value,
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </label>

                <input
                  type="text"
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value,
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value,
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <UserRound className="h-3.5 w-3.5" />
                  Clinician Name
                </label>

                <input
                  type="text"
                  value={form.clinicianName}
                  onChange={(event) =>
                    updateField(
                      "clinicianName",
                      event.target.value,
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 font-bold text-slate-900">
              Inventory Alerts
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Expiry Alert Days
                </label>

                <input
                  type="number"
                  min={0}
                  max={3650}
                  value={form.expiryAlertDays}
                  onChange={(event) =>
                    updateField(
                      "expiryAlertDays",
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Alert when medicines are within this many days of expiry.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Reorder Alert Level
                </label>

                <input
                  type="number"
                  min={0}
                  value={form.reorderAlertLevel}
                  onChange={(event) =>
                    updateField(
                      "reorderAlertLevel",
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  disabled={!canEdit}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Medicines at or below this quantity are marked low stock.
                </p>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#22577A] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1b4662] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {isSaving
                  ? "Saving..."
                  : "Save Settings"}
              </button>
            </div>
          )}
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-[#22577A]/10 p-2.5 text-[#22577A]">
              <KeyRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Account Security
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Change the password for {currentUser.email}.
              </p>
            </div>
          </div>

          {passwordError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form
            onSubmit={handleChangePassword}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Current Password
              </label>

              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />

                <input
                  type={
                    showCurrentPassword
                      ? "text"
                      : "password"
                  }
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(
                      event.target.value,
                    )
                  }
                  disabled={
                    isChangingPassword
                  }
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-11 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowCurrentPassword(
                      (previous) =>
                        !previous,
                    )
                  }
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  New Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />

                  <input
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(
                        event.target.value,
                      )
                    }
                    disabled={
                      isChangingPassword
                    }
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-11 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(
                        (previous) =>
                          !previous,
                      )
                    }
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                    aria-label={
                      showNewPassword
                        ? "Hide new password"
                        : "Show new password"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Minimum 8 characters.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Confirm New Password
                </label>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />

                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    disabled={
                      isChangingPassword
                    }
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-11 text-sm outline-none focus:border-[#22577A] disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) =>
                          !previous,
                      )
                    }
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                    aria-label={
                      showConfirmPassword
                        ? "Hide password confirmation"
                        : "Show password confirmation"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  isChangingPassword
                }
                className="inline-flex items-center gap-2 rounded-xl bg-[#22577A] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1b4662] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isChangingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}

                {isChangingPassword
                  ? "Changing Password..."
                  : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Settings;