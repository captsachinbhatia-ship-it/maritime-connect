import { AlertTriangle } from 'lucide-react';

export function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="mt-6 text-2xl font-bold text-foreground">
          Configuration Error
        </h1>
        <p className="mt-4 text-muted-foreground">
          Supabase configuration is missing. Please ensure the environment
          variables are properly set.
        </p>
      </div>
    </div>
  );
}
