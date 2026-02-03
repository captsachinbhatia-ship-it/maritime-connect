import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserX, UserCheck, Loader2 } from 'lucide-react';
import { CrmUser, updateCrmUser, CRM_ROLES } from '@/services/users';
import { useToast } from '@/hooks/use-toast';

interface UsersTableProps {
  users: CrmUser[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function UsersTable({ users, isLoading, onRefresh }: UsersTableProps) {
  const { toast } = useToast();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{ 
    open: boolean; 
    user: CrmUser | null;
    action: 'deactivate' | 'reactivate';
  }>({
    open: false,
    user: null,
    action: 'deactivate',
  });

  const handleStatusChange = async () => {
    if (!statusConfirm.user) return;

    const newActive = statusConfirm.action === 'reactivate';
    
    setUpdatingUserId(statusConfirm.user.id);
    const { error } = await updateCrmUser(statusConfirm.user.id, { 
      active: newActive,
    });
    setUpdatingUserId(null);
    setStatusConfirm({ open: false, user: null, action: 'deactivate' });

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: `User ${newActive ? 'reactivated' : 'deactivated'} successfully.`,
    });
    onRefresh();
  };

  const handleRoleChange = async (user: CrmUser, newRole: string) => {
    setUpdatingUserId(user.id);
    const { error } = await updateCrmUser(user.id, { role: newRole });
    setUpdatingUserId(null);

    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Role updated successfully.',
    });
    onRefresh();
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'ShipBroker':
        return 'default';
      case 'Desk Manager':
        return 'secondary';
      case 'Operations':
        return 'outline';
      case 'Accounts Executive':
        return 'default';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No users found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Region Focus</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className={!user.active ? 'opacity-60' : ''}>
                <TableCell className="font-medium">
                  {user.full_name || 'N/A'}
                </TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>
                  <Select
                    value={user.role || ''}
                    onValueChange={(value) => handleRoleChange(user, value)}
                    disabled={updatingUserId === user.id || !user.active}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role || 'None'}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.region_focus || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={user.active ? 'default' : 'secondary'}>
                    {user.active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.active ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setStatusConfirm({ open: true, user, action: 'deactivate' })}
                      disabled={updatingUserId === user.id}
                    >
                      <UserX className="mr-1 h-4 w-4" />
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatusConfirm({ open: true, user, action: 'reactivate' })}
                      disabled={updatingUserId === user.id}
                    >
                      <UserCheck className="mr-1 h-4 w-4" />
                      Reactivate
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={statusConfirm.open}
        onOpenChange={(open) => setStatusConfirm({ open, user: open ? statusConfirm.user : null, action: statusConfirm.action })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusConfirm.action === 'deactivate' ? 'Deactivate User' : 'Reactivate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusConfirm.action === 'deactivate' ? (
                <>
                  Deactivate <strong>{statusConfirm.user?.full_name || 'this user'}</strong>? 
                  They will lose access and will not appear in assignment lists.
                </>
              ) : (
                <>
                  Reactivate <strong>{statusConfirm.user?.full_name || 'this user'}</strong>? 
                  They will regain access and appear in assignment lists.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleStatusChange}
              className={statusConfirm.action === 'deactivate' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {statusConfirm.action === 'deactivate' ? 'Deactivate' : 'Reactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
