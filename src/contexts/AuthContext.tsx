import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import {
  CrmUser,
  bootstrapAuth,
  signInWithGoogleOnly,
  signOutUser,
  attachAuthStateListener,
} from '@/lib/authGuard';

interface AuthContextType {
  user: User | null; // Supabase auth user (for backward compatibility)
  session: Session | null;
  crmUser: CrmUser | null;
  loading: boolean;
  authError: { code: string; message: string } | null;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [crmUser, setCrmUser] = useState<CrmUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<{ code: string; message: string } | null>(null);

  // Derive user from session for backward compatibility
  const user = session?.user ?? null;

  const runBootstrap = useCallback(async (currentSession: Session | null) => {
    setLoading(true);
    setAuthError(null);

    const result = await bootstrapAuth(currentSession);

    if (result.success && result.crmUser) {
      setSession(currentSession);
      setCrmUser(result.crmUser);
      setAuthError(null);
    } else {
      setSession(null);
      setCrmUser(null);
      if (result.error && result.error.code !== 'NO_SESSION') {
        setAuthError(result.error);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      runBootstrap(initialSession);
    });

    // Attach auth state listener
    const unsubscribe = attachAuthStateListener((event, newSession) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        runBootstrap(newSession);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setCrmUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [runBootstrap]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    return signInWithGoogleOnly();
  };

  const signOut = async () => {
    await signOutUser();
    setSession(null);
    setCrmUser(null);
    setAuthError(null);
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        crmUser,
        loading,
        authError,
        signInWithGoogle,
        signOut,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
