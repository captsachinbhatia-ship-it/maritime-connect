import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ERROR_MESSAGES: Record<string, string> = {
  NOT_PROVISIONED: 'Access not provisioned. Contact admin.',
  USER_INACTIVE: 'Your access is inactive. Contact admin.',
  DOMAIN_RESTRICTED: 'Access restricted to AQ Maritime accounts.',
  ALREADY_LINKED_TO_DIFFERENT_UID: 'Account already linked to a different user. Contact admin.',
  NO_SESSION: 'Login required. Please sign in again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
};

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

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for session to be established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(ERROR_MESSAGES.NO_SESSION);
          setLoading(false);
          return;
        }

        if (!session) {
          setError(ERROR_MESSAGES.NO_SESSION);
          setLoading(false);
          return;
        }

        // Validate domain
        const email = session.user.email;
        if (!email?.toLowerCase().endsWith('@aqmaritime.com')) {
          await supabase.auth.signOut();
          setError(ERROR_MESSAGES.DOMAIN_RESTRICTED);
          setLoading(false);
          return;
        }

        // Call RPC to link Google user to CRM user
        const { data, error: rpcError } = await supabase.rpc('link_google_user_to_crm_user');

        if (rpcError) {
          console.error('RPC error:', rpcError);
          const errorCode = parseErrorCode(rpcError.message);
          await supabase.auth.signOut();
          setError(ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN);
          setLoading(false);
          return;
        }

        if (!data) {
          await supabase.auth.signOut();
          setError(ERROR_MESSAGES.NOT_PROVISIONED);
          setLoading(false);
          return;
        }

        // Success - navigate to dashboard
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Callback error:', err);
        await supabase.auth.signOut();
        setError(ERROR_MESSAGES.UNKNOWN);
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  const handleBackToLogin = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Authentication Failed</CardTitle>
            <CardDescription>Unable to complete sign-in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={handleBackToLogin} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
