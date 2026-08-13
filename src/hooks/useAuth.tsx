/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/database.types';
import { mapAuthError } from '@/lib/authErrors';

interface AuthResult {
  error: string | null;
  user: User | null;
  session: Session | null;
  requiresEmailConfirmation: boolean;
}

const isDev = import.meta.env.DEV;

function log(...args: unknown[]) {
  if (isDev) console.log('[Auth]', ...args);
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  requireAuth: () => boolean;
}

const EMPTY_RESULT: AuthResult = { error: null, user: null, session: null, requiresEmailConfirmation: false };

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => EMPTY_RESULT,
  signUp: async () => EMPTY_RESULT,
  signInWithGoogle: async () => ({ error: null }),
  resendConfirmation: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
  showAuthModal: false,
  setShowAuthModal: () => {},
  requireAuth: () => false,
});

const MAX_PROFILE_RETRIES = 5;
const PROFILE_RETRY_DELAY = 400;

async function fetchProfileWithRetry(userId: string, retries = MAX_PROFILE_RETRIES): Promise<Profile | null> {
  for (let i = 0; i < retries; i++) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) return data as Profile;
    if (i < retries - 1) await new Promise(r => setTimeout(r, PROFILE_RETRY_DELAY));
  }
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    let profile = await fetchProfileWithRetry(userId);
    if (!profile) {
      log('No profile found for user, creating one');
      const { data: userData } = await supabase.auth.getUser();
      const meta = userData?.user?.user_metadata || {};
      const username = (meta.username as string) || `user_${userId.slice(0, 8)}`;
      const displayName = (meta.full_name as string) || (meta.name as string) || username;
      const { data: newProfile, error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        username,
        display_name: displayName,
        avatar_url: (meta.avatar_url as string) || null,
      }).select().single();
      if (insertError) {
        log('Failed to create profile:', insertError.message);
        profile = null;
      } else {
        profile = newProfile as Profile;
        log('Profile created:', profile.id);
      }
    }
    if (profile) setProfile(profile);
  }, []);

  useEffect(() => {
    async function initializeAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      log('initializeAuth -> getSession result:', { hasSession: !!session, user: session?.user?.id });
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      log('initializeAuth -> setLoading(false), user:', session?.user?.id ?? null);
      setLoading(false);
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      log('onAuthStateChange event:', event, 'hasSession:', !!session, 'user:', session?.user?.id);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    unsubscribeRef.current = () => subscription.unsubscribe();

    return () => {
      unsubscribeRef.current?.();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    log('signIn started');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      log('signIn failed', error.message);
      return { error: mapAuthError(error.message), user: null, session: null, requiresEmailConfirmation: false };
    }
    log('signIn succeeded', data.user?.id);
    setUser(data.user);
    if (data.user) {
      await fetchProfile(data.user.id);
    }
    return { error: null, user: data.user, session: data.session, requiresEmailConfirmation: false };
  };

  const signUp = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    log('signUp started');
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined;
    log('signUp sending request');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: redirectTo,
      },
    });
    if (error) {
      log('signUp failed', error.message);
      return { error: mapAuthError(error.message), user: null, session: null, requiresEmailConfirmation: false };
    }
    log('signUp completed', { userId: data.user?.id, hasSession: !!data.session });
    const requiresEmailConfirmation = !data.session;
    if (data.session && data.user) {
      setUser(data.user);
      await fetchProfile(data.user.id);
    }
    return {
      error: null,
      user: data.user,
      session: data.session,
      requiresEmailConfirmation,
    };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const signInWithGoogle = async () => {
    log('signInWithGoogle starting, redirectTo:', typeof window !== 'undefined' ? window.location.origin : undefined);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    log('signInWithGoogle result:', error?.message ?? 'no error (redirecting)');
    return { error: error?.message ?? null };
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    return { error: error ? mapAuthError(error.message) : null };
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const requireAuth = useCallback(() => {
    if (loading) return false;
    if (!user) { setShowAuthModal(true); return false; }
    return true;
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, resendConfirmation, signOut, refreshProfile, showAuthModal, setShowAuthModal, requireAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
