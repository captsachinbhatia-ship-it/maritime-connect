import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Anchor, Loader2, AlertCircle, Eye } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import aqMaritimeLogo from '@/assets/logo-aq-maritime.jpg';

export default function Login() {
  const { crmUser, loading, authError, signInWithGoogle, clearAuthError, isPreviewMode, previewRole, setPreviewRole } = useAuth();

  // Preview mode - show role selector and enter button
  if (isPreviewMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-md border-amber-300 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto">
              <img 
                src={aqMaritimeLogo} 
                alt="AQ Maritime" 
                className="h-16 w-auto object-contain mx-auto"
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <Eye className="h-5 w-5" />
              <span className="font-semibold">Preview Mode</span>
            </div>
            <CardTitle className="text-2xl">AQ Maritime CRM</CardTitle>
            <CardDescription>
              Explore the CRM with simulated roles. Database writes are disabled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <p className="font-medium mb-2">Preview Role Simulation</p>
              <p className="text-xs text-amber-600">Select a role to see different UI features and permissions.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Role</label>
              <Select value={previewRole} onValueChange={(value) => setPreviewRole(value as 'Admin' | 'User')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin (Full access)</SelectItem>
                  <SelectItem value="User">User (Standard access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" size="lg">
              <a href="/">
                <Eye className="mr-2 h-4 w-4" />
                Enter Preview
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

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

  // If authenticated and CRM user is linked, redirect to dashboard
  if (crmUser) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSignIn = async () => {
    clearAuthError();
    const { error } = await signInWithGoogle();
    if (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const handleSwitchAccount = async () => {
    clearAuthError();
    // Force account selection by using select_account prompt
    const { supabase } = await import('@/lib/supabaseClient');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <img 
              src={aqMaritimeLogo} 
              alt="AQ Maritime" 
              className="h-16 w-auto object-contain mx-auto"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">AQ Maritime CRM</CardTitle>
            <CardDescription className="mt-2">
              Sign in using your AQ Maritime Google account.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {authError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authError.message}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGoogleSignIn}
            className="w-full"
            size="lg"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Only @aqmaritime.com accounts are permitted.
          </p>

          <button
            type="button"
            onClick={handleSwitchAccount}
            className="w-full text-center text-xs text-primary hover:underline"
          >
            Switch Google account
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
