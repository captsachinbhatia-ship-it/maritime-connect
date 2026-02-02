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
import { Switch } from '@/components/ui/switch';
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
import { Trash2, Loader2 } from 'lucide-react';
import { CrmUser, updateCrmUser, deleteCrmUser, CRM_ROLES } from '@/services/users';
import { useToast } from '@/hooks/use-toast';

interface UsersTableProps {
  users: CrmUser[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function UsersTable({ users, isLoading, onRefresh }: UsersTableProps) {
  const { toast } = useToast();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; user: CrmUser | null }>({
    open: false,
    user: null,
  });

  const handleToggleActive = async (user: CrmUser) => {
    setUpdatingUserId(user.id);
    const { error } = await updateCrmUser(user.id, { active: !user.active });
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
      description: `User ${user.active ? 'deactivated' : 'activated'} successfully.`,
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

  const handleDelete = async () => {
    if (!deleteConfirm.user) return;

    setUpdatingUserId(deleteConfirm.user.id);
    const { error } = await deleteCrmUser(deleteConfirm.user.id);
    setUpdatingUserId(null);
    setDeleteConfirm({ open: false, user: null });

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
      description: 'User deleted successfully.',
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
              <TableHead>Active</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name || 'N/A'}
                </TableCell>
                <TableCell>{user.email || 'N/A'}</TableCell>
                <TableCell>
                  <Select
                    value={user.role || ''}
                    onValueChange={(value) => handleRoleChange(user, value)}
                    disabled={updatingUserId === user.id}
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
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={user.active}
                      onCheckedChange={() => handleToggleActive(user)}
                      disabled={updatingUserId === user.id}
                    />
                    <span className={user.active ? 'text-green-600' : 'text-muted-foreground'}>
                      {user.active ? 'Yes' : 'No'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm({ open: true, user })}
                    disabled={updatingUserId === user.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open, user: open ? deleteConfirm.user : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteConfirm.user?.full_name || 'this user'}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
