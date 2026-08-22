import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  setAuthMode, 
  setEmailInput, 
  setPasswordInput, 
  setNameInput, 
  setOtpDigit, 
  requestOtpSend, 
  otpSendSuccess, 
  decrementOtpTimer, 
  loginSuccess, 
  loginFailure 
} from '../store/authSlice';

export const AuthPortal: React.FC = () => {
  const dispatch = useAppDispatch();
  const { 
    authMode, 
    step, 
    emailInput, 
    passwordInput, 
    nameInput, 
    otpCode, 
    otpTimeRemaining, 
    isSubmitting, 
    error 
  } = useAppSelector(state => state.auth);

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(authMode);

  // Timer countdown effect for OTP verification
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 'otp' && otpTimeRemaining > 0) {
      timer = setInterval(() => {
        dispatch(decrementOtpTimer());
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpTimeRemaining, dispatch]);

  const handleTabChange = (mode: 'login' | 'signup') => {
    setActiveTab(mode);
    dispatch(setAuthMode(mode));
  };

  // Handle OAuth Sign-in (GitHub)
  const handleGitHubOAuth = () => {
    dispatch(requestOtpSend());
    setTimeout(() => {
      dispatch(loginSuccess({
        id: 'usr_github_99',
        name: 'Alex CyberDev',
        email: 'alex.cyberdev@github.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        provider: 'github'
      }));
    }, 900);
  };

  // Handle OAuth Sign-in (Google / Gmail)
  const handleGoogleOAuth = () => {
    dispatch(requestOtpSend());
    setTimeout(() => {
      dispatch(loginSuccess({
        id: 'usr_google_88',
        name: 'Sarah Architect',
        email: 'sarah.architect@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        provider: 'google'
      }));
    }, 900);
  };

  // Step 1: Submit Email/Password to send 6-digit OTP code
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      dispatch(loginFailure('Please enter a valid email address.'));
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      dispatch(loginFailure('Password must be at least 6 characters.'));
      return;
    }

    dispatch(requestOtpSend());

    // Simulate OTP dispatch
    setTimeout(() => {
      dispatch(otpSendSuccess());
    }, 1000);
  };

  // Step 2: Verify 6-digit OTP code
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = otpCode.join('');
    if (enteredCode.length < 6) {
      dispatch(loginFailure('Please enter all 6 digits of the OTP verification code.'));
      return;
    }

    dispatch(requestOtpSend());

    // Simulate instant OTP verification
    setTimeout(() => {
      dispatch(loginSuccess({
        id: `usr_${Date.now()}`,
        name: nameInput || emailInput.split('@')[0],
        email: emailInput,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        provider: 'email'
      }));
    }, 1100);
  };

  // OTP digit box auto-focus handling
  const handleDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/[^0-9]/g, '').slice(-1);
    dispatch(setOtpDigit({ index, digit: cleanValue }));

    if (cleanValue && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-slate-950 flex items-center justify-center p-4 z-50 overflow-hidden font-sans select-none">
      {/* Cyberpunk Animated Ambient Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-purple-950/20 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 cyber-grid-dots opacity-40 pointer-events-none" />

      {/* Main Glassmorphism Auth Card */}
      <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6 z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-emerald-400 p-[1.5px] shadow-lg shadow-cyan-500/20 mb-1">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Building2 className="w-7 h-7 text-cyan-400 animate-pulse" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            CODECITY
          </h1>
          <p className="text-xs text-slate-400 font-mono flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AI System Design Analyzer Portal
          </p>
        </div>

        {/* Error Alert Message */}
        {error && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-mono rounded-xl text-center">
            {error}
          </div>
        )}

        {/* STEP 1: FORM LOGIN / SIGNUP */}
        {step === 'form' && (
          <div className="space-y-5">
            {/* Tab Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
              <button
                onClick={() => handleTabChange('login')}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  activeTab === 'login'
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => handleTabChange('signup')}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  activeTab === 'signup'
                    ? 'bg-slate-800 text-purple-400 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Register
              </button>
            </div>

            {/* Social OAuth Buttons */}
            <div className="space-y-2">
              {/* GitHub OAuth */}
              <button
                onClick={handleGitHubOAuth}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono rounded-xl flex items-center justify-center gap-2 transition shadow-sm active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>Continue with GitHub</span>
              </button>

              {/* Google OAuth */}
              <button
                onClick={handleGoogleOAuth}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono rounded-xl flex items-center justify-center gap-2 transition shadow-sm active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-800" />
              <span className="absolute px-3 bg-slate-900 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                or email authentication
              </span>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleFormSubmit} className="space-y-3 font-mono text-xs">
              {activeTab === 'signup' && (
                <div>
                  <label className="block text-slate-400 mb-1">Developer Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => dispatch(setNameInput(e.target.value))}
                      placeholder="Alex Mercer"
                      className="w-full py-2 pl-9 pr-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => dispatch(setEmailInput(e.target.value))}
                    placeholder="developer@company.io"
                    className="w-full py-2 pl-9 pr-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => dispatch(setPasswordInput(e.target.value))}
                    placeholder="••••••••••••"
                    className="w-full py-2 pl-9 pr-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 via-purple-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatching OTP Security Token...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-cyan-200" />
                    <span>{activeTab === 'login' ? 'Send OTP Code' : 'Create Account & Send OTP'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION PANEL */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5 font-mono">
            <div className="text-center space-y-1">
              <div className="inline-flex p-3 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 mb-1">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-base font-bold text-slate-100">6-Digit OTP Security Check</h2>
              <p className="text-xs text-slate-400">
                Verification code sent to <span className="text-cyan-400 font-semibold">{emailInput}</span>
              </p>
            </div>

            {/* 6 OTP Boxes */}
            <div className="flex justify-center gap-2">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-11 h-12 text-center text-lg font-bold bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/80 transition"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-cyan-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating Key & Granting Access...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify OTP & Enter CodeCity</span>
                </>
              )}
            </button>

            {/* Resend Timer */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Didn't receive code?</span>
              {otpTimeRemaining > 0 ? (
                <span className="text-cyan-400 font-bold">Resend in 0:{otpTimeRemaining < 10 ? `0${otpTimeRemaining}` : otpTimeRemaining}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => dispatch(otpSendSuccess())}
                  className="text-purple-400 font-bold hover:underline"
                >
                  Resend OTP Code
                </button>
              )}
            </div>
          </form>
        )}

        <div className="text-[10px] text-slate-500 font-mono text-center pt-2 border-t border-slate-800/60">
          Encrypted Auth Protocol v2.8 • Zero Trust Architecture
        </div>
      </div>
    </div>
  );
};
