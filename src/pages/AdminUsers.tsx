import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, RefreshCw } from 'lucide-react';
import { UsersTable } from '@/components/admin/UsersTable';
import { AddUserModal } from '@/components/admin/AddUserModal';
import { listCrmUsers, CrmUser } from '@/services/users';
import { useToast } from '@/hooks/use-toast';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [debugUser, setDebugUser] = useState<User | null>(null);
  const [debugLoading, setDebugLoading] = useState(true);
  const [isConnectivityTesting, setIsConnectivityTesting] = useState(false);

  // PART 2: Debug panel - fetch current user session
  useEffect(() => {
    const fetchDebugUser = async () => {
      setDebugLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setDebugUser(user);
      setDebugLoading(false);
    };
    fetchDebugUser();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await listCrmUsers();
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setUsers(data || []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // A) Force a direct connectivity test (bypasses invoke abstraction)
  const testEdgeFunctionConnectivity = async () => {
    setIsConnectivityTesting(true);
    try {
      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession();

      console.log('SESSION:', session, 'ERR:', sessErr);

      if (!session?.access_token) throw new Error('No access token in session');

      const url = `${SUPABASE_URL}/functions/v1/admin-create-user`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          // Use a safe test email to avoid inviting a real internal user during diagnostics
          email: 'connectivity-test@example.com',
          role: 'Operations',
          full_name: 'Connectivity Test',
        }),
      });

      console.log('RAW RES STATUS:', res.status);
      console.log('RAW RES HEADERS:', [...res.headers.entries()]);

      const text = await res.text();
      console.log('RAW RES BODY:', text);

      // Any HTTP response (even 4xx) proves connectivity works - CORS/network is fine
      if (res.status >= 200 && res.status < 500) {
        toast({
          title: '✅ Connectivity Test Passed',
          description: `Edge Function responded with status ${res.status}. Network and CORS are working correctly. You can now use "Add User" with a real email address.`,
        });
      } else {
        throw new Error(`Server error: ${res.status} ${text}`);
      }
    } catch (err) {
      console.error('Edge Function call failed:', err);
      toast({
        title: 'Connectivity Test Failed',
        description: err instanceof Error ? err.message : JSON.stringify(err),
        variant: 'destructive',
      });
    } finally {
      setIsConnectivityTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PART 2: Debug Panel - TEMPORARY */}
      <Card className="border-dashed border-accent bg-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-accent-foreground">🔧 Session Debug (Temporary)</CardTitle>
        </CardHeader>
        <CardContent>
          {debugLoading ? (
            <p className="text-sm text-muted-foreground">Loading session...</p>
          ) : debugUser ? (
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
              {JSON.stringify({ id: debugUser.id, email: debugUser.email, role: debugUser.role }, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-destructive font-medium">⚠️ Session is NULL - User not authenticated!</p>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin – Users</h1>
          <p className="mt-1 text-muted-foreground">
            Invite and manage CRM users
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            onClick={testEdgeFunctionConnectivity}
            disabled={isConnectivityTesting}
          >
            {isConnectivityTesting ? 'Testing…' : 'Test Edge Function Connectivity'}
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} disabled={!debugUser}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>CRM Users</CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? 's' : ''} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} isLoading={isLoading} onRefresh={fetchUsers} />
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <AddUserModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onUserCreated={fetchUsers}
      />
    </div>
  );
}
