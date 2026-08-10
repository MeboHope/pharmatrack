import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Shield, 
  CheckCircle2, 
  X, 
  KeyRound, 
  Send, 
  AlertCircle, 
  Copy, 
  Check, 
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck
} from 'lucide-react';
import { UserAccount } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUser: UserAccount | null;
  onLoginSuccess: (user: UserAccount) => void;
  onSignUpSuccess: (newUser: UserAccount) => void;
  initialMode?: 'login' | 'signup' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onLoginSuccess,
  onSignUpSuccess,
  initialMode = 'login',
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setOtpStep(false);
      setLoginError('');
      setSignupError('');
      setResetError('');
    }
  }, [isOpen, initialMode]);

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

  // OTP Verification state
  const [otpStep, setOtpStep] = useState(false); // false = form, true = enter OTP
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpCopied, setOtpCopied] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpSentMessage, setOtpSentMessage] = useState(false);

  // Reset Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpStep, setResetOtpStep] = useState(false);
  const [resetGeneratedOtp, setResetGeneratedOtp] = useState('');
  const [resetEnteredOtp, setResetEnteredOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // OTP Countdown Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpStep && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpStep, otpTimer]);

  if (!isOpen) return null;

  // Helper to generate 6-digit OTP
  const generateNewOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  };

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const found = users.find(
      (u) => u.email.toLowerCase() === loginEmail.trim().toLowerCase()
    ) || users[0];

    if (found) {
      onLoginSuccess(found);
      onClose();
    } else {
      const defaultUser: UserAccount = {
        id: 'usr-' + Date.now(),
        name: loginEmail ? loginEmail.split('@')[0] : 'Dr. Sarah Jenkins',
        email: loginEmail || 's.jenkins@pharmatrack.com',
        role: 'Pharmacist',
        passwordHash: loginPassword || '123456',
        isVerified: true,
        createdAt: new Date().toISOString()
      };
      onLoginSuccess(defaultUser);
      onClose();
    }
  };

  // Quick Demo Login
  const handleQuickLogin = (demoUser: UserAccount) => {
    onLoginSuccess(demoUser);
    onClose();
  };

  // Request Signup OTP
  const handleRequestSignupOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    if (!signupName.trim()) {
      setSignupError('Full Name is required.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setSignupError('Please enter a valid email address.');
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

    // Check if email already exists
    const existing = users.find((u) => u.email.toLowerCase() === signupEmail.trim().toLowerCase());
    if (existing) {
      setSignupError('An account with this email address already exists. Please log in instead.');
      return;
    }

    // Generate & send OTP
    const code = generateNewOtp();
    setGeneratedOtp(code);
    setOtpStep(true);
    setOtpTimer(60);
    setOtpSentMessage(true);
  };

  // Verify Signup OTP
  const handleVerifySignupOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    if (enteredOtp.trim() !== generatedOtp) {
      setSignupError('Invalid OTP code. Please check the simulated email notification code below.');
      return;
    }

    // Create New User
    const newUser: UserAccount = {
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
      name: signupName.trim(),
      email: signupEmail.trim().toLowerCase(),
      phone: signupPhone.trim(),
      role: signupRole,
      passwordHash: signupPassword,
      isVerified: true,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    onSignUpSuccess(newUser);
    onClose();
  };

  // Handle Request Password Reset OTP
  const handleRequestResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    const existing = users.find((u) => u.email.toLowerCase() === resetEmail.trim().toLowerCase());
    if (!existing) {
      setResetError('No account found with this email address.');
      return;
    }

    const code = generateNewOtp();
    setResetGeneratedOtp(code);
    setResetOtpStep(true);
  };

  // Handle Verify Reset OTP & Update Password
  const handleVerifyResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (resetEnteredOtp.trim() !== resetGeneratedOtp) {
      setResetError('Invalid verification OTP code.');
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError('New password must be at least 6 characters.');
      return;
    }

    // Update password in user list
    const updatedUsers = users.map((u) => {
      if (u.email.toLowerCase() === resetEmail.trim().toLowerCase()) {
        return { ...u, passwordHash: resetNewPassword };
      }
      return u;
    });

    localStorage.setItem('pharmatrack_users', JSON.stringify(updatedUsers));
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
      setAuthMode('login');
      setLoginEmail(resetEmail);
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setOtpCopied(true);
    setTimeout(() => setOtpCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Header Banner */}
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
                {authMode === 'signup' && 'Create your account with email OTP verification'}
                {authMode === 'forgot' && 'Reset your password via Email OTP'}
              </p>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex gap-2 mt-5 bg-black/20 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setOtpStep(false);
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
                setOtpStep(false);
                setSignupError('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signup'
                  ? 'bg-white text-[#22577A] shadow-xs'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              Sign Up (OTP)
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
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setAuthMode('forgot')}
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
                className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                Log In <ArrowRight className="w-4 h-4" />
              </button>

              {/* Demo Accounts List */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Quick Demo Login Options
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {users.slice(0, 2).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleQuickLogin(user)}
                      className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-[#22577A]">
                          {user.name}
                        </div>
                        <div className="text-[10px] text-slate-500">{user.email} • {user.role}</div>
                      </div>
                      <span className="text-[10px] font-bold text-[#22577A] bg-sky-100 px-2 py-0.5 rounded">
                        Quick Log In
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: SIGN UP (WITH EMAIL OTP) */}
          {authMode === 'signup' && (
            <div>
              {signupError && (
                <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{signupError}</span>
                </div>
              )}

              {!otpStep ? (
                /* STEP 1: Signup Details Form */
                <form onSubmit={handleRequestSignupOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
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
                      Email Address (for OTP verification) *
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
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Role *
                      </label>
                      <select
                        value={signupRole}
                        onChange={(e) => setSignupRole(e.target.value as any)}
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
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Password *
                      </label>
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
                    className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" /> Send Verification Code (OTP)
                  </button>
                </form>
              ) : (
                /* STEP 2: OTP Entry Form */
                <form onSubmit={handleVerifySignupOtp} className="space-y-4">
                  {/* Simulated Email Delivery Banner */}
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-800">
                        <Mail className="w-4 h-4" /> Simulated Email OTP Sent!
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                        Just Now
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      We've dispatched a 6-digit code to <strong>{signupEmail}</strong>:
                    </p>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-300 flex items-center justify-between font-mono text-lg font-bold tracking-widest text-emerald-900 shadow-xs">
                      <span>{generatedOtp}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEnteredOtp(generatedOtp);
                          copyToClipboard(generatedOtp);
                        }}
                        className="text-xs font-sans font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                      >
                        {otpCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {otpCopied ? 'Copied & Auto-filled!' : 'Auto-fill OTP'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Enter 6-Digit OTP Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 591034"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      className="w-full text-center text-xl font-mono tracking-widest font-bold py-2 bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => setOtpStep(false)}
                      className="hover:underline text-slate-700 font-medium"
                    >
                      ← Edit Registration Details
                    </button>
                    <button
                      type="button"
                      disabled={otpTimer > 0}
                      onClick={() => {
                        const code = generateNewOtp();
                        setGeneratedOtp(code);
                        setOtpTimer(60);
                      }}
                      className="text-[#22577A] hover:underline font-semibold disabled:opacity-50 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Resend OTP {otpTimer > 0 && `(${otpTimer}s)`}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Verify OTP & Create Account
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: FORGOT PASSWORD RESET VIA OTP */}
          {authMode === 'forgot' && (
            <div className="space-y-4">
              {resetError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div>Password reset successfully! Redirecting to login...</div>
                </div>
              ) : !resetOtpStep ? (
                <form onSubmit={handleRequestResetOtp} className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Enter your registered email address and we will send you a 6-digit OTP code to reset your password.
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
                    className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send Password Reset OTP
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyResetOtp} className="space-y-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                    <div className="text-xs font-bold">Simulated Reset OTP Code:</div>
                    <div className="font-mono text-lg font-bold text-emerald-800">{resetGeneratedOtp}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Enter 6-Digit Reset OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={resetEnteredOtp}
                      onChange={(e) => setResetEnteredOtp(e.target.value)}
                      className="w-full text-center text-lg font-mono tracking-widest font-bold py-2 border border-slate-300 rounded-xl focus:border-[#22577A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:border-[#22577A]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 text-sm font-bold text-white bg-[#22577A] hover:bg-[#1b4662] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" /> Reset Password Now
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
