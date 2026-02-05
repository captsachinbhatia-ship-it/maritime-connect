import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * HARD GATE: No crmUser = No access. Period.
 * - No guest mode
 * - No partial dashboards
 * - No local user state fallbacks
 * 
 * EXCEPTION: Preview mode on lovable.dev/lovableproject.com
 * - Uses mock CRM user for role simulation
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { crmUser, loading, authError, signOut, isPreviewMode } = useAuth();

  // In preview mode, always allow access with mock user
  if (isPreviewMode) {
    return <>{children}</>;
  }

  // Loading state - show spinner, never partial content
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

  // HARD FAIL: Auth error present - show error, no navigation into app
  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Access Denied</CardTitle>
            <CardDescription>Unable to verify your access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
              {authError.message}
            </div>
            <Button 
              onClick={async () => {
                await signOut();
                window.location.href = '/login';
              }} 
              className="w-full"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // HARD FAIL: No CRM user after loading complete = redirect immediately
  // This is the final gate. No exceptions. No fallbacks.
  if (!crmUser) {
    return <Navigate to="/login" replace />;
  }

  // ONLY render children if we have a valid, linked CRM user
  return <>{children}</>;
}
