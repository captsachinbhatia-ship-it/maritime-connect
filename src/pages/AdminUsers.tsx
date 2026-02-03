import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UserPlus, RefreshCw } from 'lucide-react';
import { UsersTable } from '@/components/admin/UsersTable';
import { AddUserModal } from '@/components/admin/AddUserModal';
import { listCrmUsers, CrmUser } from '@/services/users';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await listCrmUsers({ includeInactive: showInactive });
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
  }, [showInactive]);

  return (
    <div className="space-y-6">
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
          <Button onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CRM Users</CardTitle>
              <CardDescription>
                {users.length} user{users.length !== 1 ? 's' : ''} {showInactive ? 'total' : 'active'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
                Show inactive users
              </Label>
            </div>
          </div>
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
