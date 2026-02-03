import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

export interface CrmUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
}

export interface AuthBootstrapResult {
  success: boolean;
  crmUser?: CrmUser;
  error?: {
    code: string;
    message: string;
  };
}

const ERROR_MESSAGES: Record<string, string> = {
  NOT_PROVISIONED: 'Access not provisioned. Contact admin.',
  USER_INACTIVE: 'Your access is inactive. Contact admin.',
  DOMAIN_RESTRICTED: 'Access restricted to AQ Maritime accounts.',
  ALREADY_LINKED_TO_DIFFERENT_UID: 'Account already linked to a different user. Contact admin.',
  NO_SESSION: 'Session expired. Please login again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

/**
 * Initiates Google OAuth sign-in flow
 */
export async function signInWithGoogleOnly(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        prompt: 'consent select_account',
        access_type: 'offline',
        include_granted_scopes: 'true',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Signs out the current user
 */
export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Validates email domain is @aqmaritime.com
 */
function isValidDomain(email: string | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith('@aqmaritime.com');
}

/**
 * Bootstrap authentication - validates session, domain, and links to CRM user
 * Must be called on app load, SIGNED_IN, and TOKEN_REFRESHED events
 */
export async function bootstrapAuth(session: Session | null): Promise<AuthBootstrapResult> {
  // No session - user needs to login
  if (!session) {
    return {
      success: false,
      error: {
        code: 'NO_SESSION',
        message: ERROR_MESSAGES.NO_SESSION,
      },
    };
  }

  const userEmail = session.user.email;

  // Validate domain
  if (!isValidDomain(userEmail)) {
    await signOutUser();
    return {
      success: false,
      error: {
        code: 'DOMAIN_RESTRICTED',
        message: ERROR_MESSAGES.DOMAIN_RESTRICTED,
      },
    };
  }

  // Call RPC to link Google user to CRM user
  const { data, error } = await supabase.rpc('link_google_user_to_crm_user');

  if (error) {
    // Parse error code from message if available
    const errorCode = parseErrorCode(error.message);
    await signOutUser();
    return {
      success: false,
      error: {
        code: errorCode,
        message: ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN,
      },
    };
  }

  // RPC should return the CRM user data
  if (!data) {
    await signOutUser();
    return {
      success: false,
      error: {
        code: 'NOT_PROVISIONED',
        message: ERROR_MESSAGES.NOT_PROVISIONED,
      },
    };
  }

  return {
    success: true,
    crmUser: data as CrmUser,
  };
}

/**
 * Parse error code from RPC error message
 */
function parseErrorCode(message: string): string {
  const knownCodes = [
    'NOT_PROVISIONED',
    'USER_INACTIVE',
    'DOMAIN_RESTRICTED',
    'ALREADY_LINKED_TO_DIFFERENT_UID',
    'NO_SESSION',
  ];

  for (const code of knownCodes) {
    if (message.includes(code)) {
      return code;
    }
  }

  return 'UNKNOWN';
}

/**
 * Attach auth state listener for handling auth events
 */
export function attachAuthStateListener(
  onAuthChange: (event: string, session: Session | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    onAuthChange(event, session);
  });

  return () => subscription.unsubscribe();
}
