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

// Preview mode detection
function isPreviewDomain(): boolean {
  const hostname = window.location.hostname;
  return hostname.endsWith('lovable.dev') || hostname.endsWith('lovableproject.com');
}

const PREVIEW_ROLE_KEY = 'preview_role';

type PreviewRole = 'admin' | 'user';

const MOCK_USERS: Record<PreviewRole, CrmUser> = {
  admin: {
    id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Preview Admin',
    email: 'admin@aqmaritime.com',
    role: 'Admin',
    active: true,
  },
  user: {
    id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Preview User',
    email: 'user@aqmaritime.com',
    role: 'Operations',
    active: true,
  },
};

interface AuthContextType {
  user: User | null; // Supabase auth user (for backward compatibility)
  session: Session | null;
  crmUser: CrmUser | null;
  loading: boolean;
  authError: { code: string; message: string } | null;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
  // Preview mode
  isPreviewMode: boolean;
  previewRole: PreviewRole;
  setPreviewRole: (role: PreviewRole) => void;
  // Computed admin status (works in both preview and production)
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const isPreviewMode = isPreviewDomain();
  
  const [previewRole, setPreviewRoleState] = useState<PreviewRole>(() => {
    if (!isPreviewMode) return 'user';
    const stored = localStorage.getItem(PREVIEW_ROLE_KEY);
    return (stored === 'admin' || stored === 'user') ? stored : 'user';
  });

  const [session, setSession] = useState<Session | null>(null);
  const [crmUser, setCrmUser] = useState<CrmUser | null>(null);
  const [loading, setLoading] = useState(!isPreviewMode);
  const [authError, setAuthError] = useState<{ code: string; message: string } | null>(null);
  const [dbIsAdmin, setDbIsAdmin] = useState(false);

  const setPreviewRole = (role: PreviewRole) => {
    setPreviewRoleState(role);
    localStorage.setItem(PREVIEW_ROLE_KEY, role);
  };

  // In preview mode, use mock user; otherwise derive from session
  const user = isPreviewMode ? null : (session?.user ?? null);
  const effectiveCrmUser = isPreviewMode ? MOCK_USERS[previewRole] : crmUser;
  
  // Compute isAdmin: in preview mode use previewRole, otherwise use DB check
  const isAdmin = isPreviewMode ? previewRole === 'admin' : dbIsAdmin;

  const runBootstrap = useCallback(async (currentSession: Session | null) => {
    // Skip bootstrap in preview mode
    if (isPreviewMode) return;
    
    setLoading(true);
    setAuthError(null);

    const result = await bootstrapAuth(currentSession);

    if (result.success && result.crmUser) {
      setSession(currentSession);
      setCrmUser(result.crmUser);
      setAuthError(null);
      
      // Check admin status from profiles table
      if (currentSession?.user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentSession.user.id)
          .maybeSingle();
        setDbIsAdmin(data?.role === 'ADMIN' || data?.role === 'CEO');
      }
    } else {
      setSession(null);
      setCrmUser(null);
      setDbIsAdmin(false);
      if (result.error && result.error.code !== 'NO_SESSION') {
        setAuthError(result.error);
      }
    }

    setLoading(false);
  }, [isPreviewMode]);

  useEffect(() => {
    // In preview mode, skip auth bootstrap
    if (isPreviewMode) {
      setLoading(false);
      return;
    }

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
  }, [runBootstrap, isPreviewMode]);

  const signInWithGoogle = async () => {
    if (isPreviewMode) {
      return { error: 'Sign-in disabled in preview mode' };
    }
    setAuthError(null);
    return signInWithGoogleOnly();
  };

  const signOut = async () => {
    if (isPreviewMode) return;
    await signOutUser();
    setSession(null);
    setCrmUser(null);
    setDbIsAdmin(false);
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
        crmUser: effectiveCrmUser,
        loading,
        authError,
        signInWithGoogle,
        signOut,
        clearAuthError,
        isPreviewMode,
        previewRole,
        setPreviewRole,
        isAdmin,
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
