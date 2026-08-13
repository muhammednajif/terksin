import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, X, MailCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { getErrorCategory } from '@/lib/authErrors';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const isDev = import.meta.env.DEV;

function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Display name is required.';
  if (trimmed.length < 2) return 'Display name must be at least 2 characters.';
  if (trimmed.length > 50) return 'Display name is too long.';
  return null;
}

function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email address.';
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { signIn, signUp, signInWithGoogle, resendConfirmation } = useAuth();
  const showToast = useStore(s => s.showToast);
  const submittingRef = useRef(false);
  const cooldownUntilRef = useRef(0);

  const errorCategory = getErrorCategory(error);

  const validate = (): string | null => {
    if (mode === 'signup') {
      const nameErr = validateDisplayName(displayName);
      if (nameErr) return nameErr;
    }
    const emailErr = validateEmail(email);
    if (emailErr) return emailErr;
    const passErr = validatePassword(password);
    if (passErr) return passErr;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submittingRef.current || loading) {
      if (isDev) console.log('[AuthModal] submission blocked: already submitting');
      return;
    }

    if (Date.now() < cooldownUntilRef.current) {
      const remaining = Math.ceil((cooldownUntilRef.current - Date.now()) / 1000);
      if (isDev) console.log('[AuthModal] submission blocked: cooldown', remaining, 's remaining');
      setError(`Please wait ${remaining} seconds before trying again.`);
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    submittingRef.current = true;
    setError(null);
    setLoading(true);

    if (isDev) console.log('[AuthModal] submission started', mode);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = mode === 'signin'
        ? await signIn(normalizedEmail, password)
        : await signUp(normalizedEmail, password, displayName.trim());

      if (result.error) {
        if (isDev) console.log('[AuthModal] submission error:', result.error);
        setError(result.error);

        if (getErrorCategory(result.error) === 'rate_limited') {
          cooldownUntilRef.current = Date.now() + 30000;
          if (isDev) console.log('[AuthModal] rate-limit cooldown set for 30s');
        }
        return;
      }

      if (mode === 'signup') {
        if (result.requiresEmailConfirmation) {
          if (isDev) console.log('[AuthModal] signup requires email confirmation');
          showToast('Account created! Check your email to confirm.');
          setEmailSent(true);
        } else {
          if (isDev) console.log('[AuthModal] signup success, auto-authenticated');
          showToast('Welcome to Treksin!');
          resetForm();
          onClose();
        }
      } else {
        if (isDev) console.log('[AuthModal] signin success');
        showToast('Welcome back!');
        resetForm();
        onClose();
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (submittingRef.current || loading) return;
    submittingRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const result = await resendConfirmation(email);
      if (result.error) {
        setError(result.error);
      } else {
        showToast('Confirmation email sent! Check your inbox.');
        setEmailSent(true);
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const handleGoogle = async () => {
    if (googleLoading) return;
    setError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    if (result.error) { setError(result.error); setGoogleLoading(false); }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError(null);
    setEmailSent(false);
    setMode('signin');
    setShowPassword(false);
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl border border-black/10">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors">
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-brand-emerald/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-brand-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3.5 12L12 3.5l8.5 8.5M12 3.5v17" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">
                {emailSent ? 'Check your email' : mode === 'signin' ? 'Welcome back' : 'Join Treksin'}
              </h2>
              <p className="text-sm text-black/50 mt-1">
                {emailSent
                  ? `We sent a confirmation link to ${email}`
                  : mode === 'signin' ? 'Sign in to continue your journey' : 'Create an account to start exploring'}
              </p>
            </div>

            {emailSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-brand-emerald/10 flex items-center justify-center mx-auto">
                  <MailCheck className="w-8 h-8 text-brand-emerald" />
                </div>
                <p className="text-sm text-black/60">Please check your email inbox (and spam folder) and click the confirmation link.</p>
                <button onClick={handleResend} disabled={loading}
                  className="text-sm text-brand-emerald font-semibold hover:underline disabled:opacity-50">
                  {loading ? 'Sending...' : "Didn't receive it? Resend"}
                </button>
                <div>
                  <button onClick={() => { setEmailSent(false); setMode('signin'); setError(null); }}
                    className="text-sm text-black/50 hover:text-black transition-colors">
                    Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={handleGoogle} disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 border border-black/20 rounded-xl hover:bg-black/5 transition-all font-medium disabled:opacity-50">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {googleLoading ? 'Connecting...' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-black/10" />
                  <span className="text-xs text-black/40 font-medium">OR</span>
                  <div className="flex-1 h-px bg-black/10" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {mode === 'signup' && (
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                      <input type="text" placeholder="Display Name" value={displayName}
                        onChange={e => setDisplayName(e.target.value)} required maxLength={50}
                        className="w-full pl-11 pr-4 py-3 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 transition-all" />
                    </div>
                  )}
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                    <input type="email" placeholder="Email address" value={email}
                      onChange={e => setEmail(e.target.value)} required
                      className="w-full pl-11 pr-4 py-3 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 transition-all" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                      onChange={e => setPassword(e.target.value)} required minLength={6}
                      className="w-full pl-11 pr-11 py-3 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {error && (
                    <div className={`rounded-xl px-4 py-3 space-y-2 ${
                      errorCategory === 'rate_limited'
                        ? 'bg-orange-50 border border-orange-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className={`text-sm ${
                        errorCategory === 'rate_limited' ? 'text-orange-700' : 'text-red-600'
                      }`}>{error}</p>
                      {errorCategory === 'email_not_confirmed' && (
                        <button type="button" onClick={handleResend} disabled={loading}
                          className="text-sm text-brand-emerald font-semibold hover:underline disabled:opacity-50">
                          Resend confirmation email
                        </button>
                      )}
                      {errorCategory === 'rate_limited' && (
                        <p className="text-xs text-orange-600">Using Google sign-in above will bypass this wait time.</p>
                      )}
                    </div>
                  )}
                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-brand-emerald text-white rounded-xl font-semibold hover:bg-brand-emerald/90 transition-all disabled:opacity-50 active:scale-[0.98]">
                    {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                </form>

                <p className="text-sm text-center mt-6 text-black/50">
                  {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                  <button onClick={switchMode}
                    className="text-brand-emerald font-semibold hover:underline">
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
