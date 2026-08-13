import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { mapAuthError } from '@/lib/authErrors';

type CallbackState = 'processing' | 'success' | 'error';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processedRef = useRef(false);
  const [state, setState] = useState<CallbackState>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');

    (async () => {
      if (code) {
        // Let auto-detection handle the exchange, wait for session
        for (let i = 0; i < 15; i++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setState('success');
            setTimeout(() => navigate('/community', { replace: true }), 1500);
            return;
          }
          await new Promise(r => setTimeout(r, 300));
        }
        // If no session after retries, try manual exchange as fallback
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setState('error');
          setErrorMessage(mapAuthError(error.message));
          return;
        }
        setState('success');
        setTimeout(() => navigate('/community', { replace: true }), 1500);
      } else {
        // No code in URL - check if session already exists
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setState('success');
          setTimeout(() => navigate('/community', { replace: true }), 1500);
        } else {
          setState('error');
          setErrorMessage('No confirmation code found in the URL.');
        }
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl border border-black/10 text-center">
        <div className="w-12 h-12 bg-brand-emerald/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-brand-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3.5 12L12 3.5l8.5 8.5M12 3.5v17" />
          </svg>
        </div>

        {state === 'processing' && (
          <>
            <h2 className="text-2xl font-bold mb-2">Confirming your account...</h2>
            <p className="text-sm text-black/50">Please wait while we verify your email confirmation.</p>
            <div className="flex justify-center mt-6">
              <div className="w-8 h-8 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
            </div>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-brand-emerald/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-brand-emerald" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Email confirmed!</h2>
            <p className="text-sm text-black/50">You're now signed in. Redirecting you to the community...</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Confirmation failed</h2>
            <p className="text-sm text-red-600 mb-6">{errorMessage}</p>
            <div className="flex flex-col gap-3">
              <Link to="/auth/callback?retry=1"
                className="w-full py-3 bg-brand-emerald text-white rounded-xl font-semibold hover:bg-brand-emerald/90 transition-all text-sm text-center">
                Try again
              </Link>
              <Link to="/"
                className="w-full py-3 border border-black/20 rounded-xl font-semibold hover:bg-black/5 transition-all text-sm text-center">
                Return home
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
