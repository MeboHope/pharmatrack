import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  CheckCircle2,
  X,
  Send,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { UserAccount } from '../types';
import { sendPasswordReset, signIn, signUp } from '../lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onLoginSuccess: (user: UserAccount) => void;
  initialMode?: 'login' | 'signup' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  initialMode = 'login',
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupRole, setSignupRole] = useState<'Clinician' | 'Pharmacist' | 'Admin'>('Clinician');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupNotice, setSignupNotice] = useState('');

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setLoginError('');
      setSignupError('');
      setSignupNotice('');
      setResetError('');
      setResetSent(false);
      setIsSubmitting(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    try {
      const user = await signIn(loginEmail.trim().toLowerCase(), loginPassword);
      onLoginSuccess(user);
      setLoginPassword('');
      onClose();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    setSignupNotice('');

    if (!signupName.trim()) {
      setSignupError('Full Name is required.');
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signUp({
        name: signupName.trim(),
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
        phone: signupPhone.trim(),
        role: signupRole,
      });

      setSignupPassword('');
      setSignupConfirmPassword('');

      if (result.needsEmailConfirmation || !result.user) {
        setSignupNotice(
          `Account created. Check ${signupEmail.trim()} for a confirmation link, then log in.`
        );
        return;
      }

      onLoginSuccess(result.user);
      onClose();
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : 'Unable to sign up. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setIsSubmitting(true);

    try {
      await sendPasswordReset(resetEmail.trim().toLowerCase());
      setResetSent(true);
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : 'Unable to send the reset email. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="bg-[#22577A] text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <img src="/logo/logo.png" alt="PharmaTrack Logo" className="w-10 h-10 object-contain shrink-0" />
            <div>
              <h2 className="text-xl font-bold tracking-tight">PharmaTrack Account</h2>
              <p className="text-xs text-white/80 font-medium">
                {authMode === 'login' && 'Log in to access dispensing & management system'}
                {authMode === 'signup' && 'Create your account to access the pharmacy database'}
                {authMode === 'forgot' && 'Reset your password via a secure email link'}
              </p>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex gap-2 mt-5 bg-black/20 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setLoginError('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode === 'login'
                  ? 'bg-white text-[#22577A] shadow-xs'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setSignupError('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signup'
                  ? 'bg-white text-[#22577A] shadow-xs'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Currently Logged In Banner */}
          {currentUser && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#57CC99]" />
                <div>
                  <span className="text-slate-500 font-medium">Active Session: </span>
                  <strong className="text-slate-900">{currentUser.name}</strong>
                  <span className="ml-1 text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: LOG IN */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
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
                    placeholder="sarah.jenkins@afyalinkpharmacy.co.ke"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(loginEmail);
                      setAuthMode('forgot');
                    }}
                    className="text-[11px] font-semibold text-[#22577A] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Logging in...
                  </>
                ) : (
                  <>
                    Log In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: SIGN UP */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3">
              {signupError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{signupError}</span>
                </div>
              )}

              {signupNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{signupNotice}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Dr. Alex Rivera"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
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
                    placeholder="alex.rivera@afyalinkpharmacy.co.ke"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={signupRole}
                    onChange={(e) =>
                      setSignupRole(e.target.value as 'Clinician' | 'Pharmacist' | 'Admin')
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden font-medium"
                  >
                    <option value="Clinician">Clinician</option>
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="0712345678"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Password *</label>
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 chars"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating account...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Create Account
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {authMode === 'forgot' && (
            <div className="space-y-4">
              {resetError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSent ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div>
                    If an account exists for {resetEmail}, a password reset link is on its way.
                    Follow the link in the email to choose a new password.
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="text-[#22577A] hover:underline font-bold"
                  >
                    Back to log in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestReset} className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Enter your registered email address and we will send you a secure link to reset
                    your password.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="sarah.jenkins@afyalinkpharmacy.co.ke"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Password Reset Link
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
