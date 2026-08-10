// src/components/Settings.tsx
import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Building2, CheckCircle2, Lock, Shield, KeyRound, User, Mail, AlertCircle, LogOut, ArrowDown } from 'lucide-react';
import { PharmacySettings, UserAccount } from '../types';
import { signIn, updatePassword } from '../lib/auth';

interface SettingsProps {
  settings: PharmacySettings;
  onSaveSettings: (newSettings: PharmacySettings) => void;
  currentUser: UserAccount | null;
  onOpenAuthModal: () => void;
}

const getInitials = (name: string): string => {
  if (!name) return 'SJ';
  const clean = name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Doctor)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SJ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  onSaveSettings,
  currentUser,
  onOpenAuthModal
}) => {
  const [formData, setFormData] = useState<PharmacySettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  // Password Change state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentUser) {
      setPasswordError('No user is currently logged in. Please log in first.');
      return;
    }

    if (newPasswordInput.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Re-authenticate so the current password is genuinely verified.
      await signIn(currentUser.email, currentPasswordInput);
      await updatePassword(newPasswordInput);

      setPasswordSuccess('Your password has been changed successfully!');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(
        err instanceof Error && err.message.toLowerCase().includes('credentials')
          ? 'Current password is incorrect.'
          : err instanceof Error
            ? err.message
            : 'Unable to change your password. Please try again.'
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1000px] mx-auto">
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Pharmacy settings updated successfully! All receipts and dashboards reflect the new configuration.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
        {/* Pharmacy Identity */}
        <div className="space-y-4">
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#22577A] font-bold">
              <Building2 className="w-5 h-5" />
              <h2 className="text-base text-slate-900">Pharmacy Profile & Identity</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pharmacy Name *
              </label>
              <input
                type="text"
                required
                value={formData.pharmacyName}
                onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">Displays on dashboard welcome banner and receipts</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address Location</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Contact</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Clinician / Practitioner Identity */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="border-b border-slate-200 pb-2 flex items-center gap-2 text-[#22577A] font-bold">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="4" />
              <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
              <path d="M12 11v5" />
              <path d="M9.5 13.5h5" />
            </svg>
            <h2 className="text-base text-slate-900">Active Clinician / Practitioner Name</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinician Name (Automatic from logged-in user or settings) *
              </label>
              <input
                type="text"
                required
                value={formData.clinicianName}
                onChange={(e) => setFormData({ ...formData, clinicianName: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-400 mt-1">Pre-fills prescriber details during dispensing wizard</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Code / Symbol</label>
              <input
                type="text"
                required
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden font-bold"
              />
            </div>
          </div>
        </div>

        {/* Stock Alert Thresholds */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-2">
            Inventory Threshold Rules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Alert Threshold (Days)
              </label>
              <input
                type="number"
                min="1"
                value={formData.expiryAlertDays}
                onChange={(e) => setFormData({ ...formData, expiryAlertDays: parseInt(e.target.value) || 90 })}
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reorder Alert Level (Units)
              </label>
              <input
                type="number"
                min="1"
                value={formData.reorderAlertLevel}
                onChange={(e) => setFormData({ ...formData, reorderAlertLevel: parseInt(e.target.value) || 10 })}
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="px-6 py-3 text-sm font-bold text-white rounded-xl shadow-md transition-colors flex items-center gap-2"
            style={{ backgroundColor: '#0d8065' }}
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </form>

      {/* DEDICATED PASSWORD CHANGING & ACCOUNT SECURITY SECTION */}
      <div id="account-security" className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#22577A] font-bold">
            <Lock className="w-5 h-5 text-[#57CC99]" />
            <h2 className="text-lg text-slate-900">Account Security & Password Management</h2>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-semibold border border-slate-200">
            Settings &gt; Account Security
          </span>
        </div>

        {/* Current User Card */}
        {currentUser ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-11 h-11 rounded-full bg-[#22577A] text-white flex items-center justify-center text-sm leading-none shrink-0 shadow-sm"
                style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}
              >
                {getInitials(formData.clinicianName || currentUser.name)}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>{formData.clinicianName || currentUser.name}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#22577A]/10 text-[#22577A] rounded-md">
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-xs text-slate-500">{currentUser.email}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" /> Switch Account / Log In
            </button>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
            <span>No account currently logged in.</span>
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-3.5 py-1.5 bg-[#22577A] text-white font-bold rounded-lg"
            >
              Log In / Sign Up
            </button>
          </div>
        )}

        {/* Change Password Form */}
        <form onSubmit={handlePasswordChange} className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#22577A]" /> Change Account Password
          </h3>

          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                placeholder="Min 6 characters"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                placeholder="Repeat new password"
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="text-xs font-semibold text-[#22577A] hover:underline"
            >
              Forgot current password? Reset via email →
            </button>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <KeyRound className="w-4 h-4" /> {isChangingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

