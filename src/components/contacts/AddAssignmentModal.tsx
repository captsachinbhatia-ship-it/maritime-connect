import { useState, useEffect } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { listCrmUsers, CrmUser } from '@/services/users';
import { addAssignment } from '@/services/assignments';

interface AddAssignmentModalProps {
  contactId: string;
  contactName: string;
  currentStage: string;
  existingAssigneeIds: string[]; // Already assigned user IDs to exclude
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddAssignmentModal({
  contactId,
  contactName,
  currentStage,
  existingAssigneeIds,
  isOpen,
  onClose,
  onSuccess,
}: AddAssignmentModalProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assignmentRole, setAssignmentRole] = useState<'PRIMARY' | 'SECONDARY'>('SECONDARY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    const result = await listCrmUsers();
    if (result.data) {
      // Filter out already assigned users
      const availableUsers = result.data.filter(
        u => !existingAssigneeIds.includes(u.id)
      );
      setUsers(availableUsers);
    }
    setIsLoadingUsers(false);
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast({
        variant: 'destructive',
        title: 'Validation error',
        description: 'Please select a user to assign.',
      });
      return;
    }

    setIsSubmitting(true);

    const result = await addAssignment({
      contact_id: contactId,
      assigned_to_crm_user_id: selectedUserId,
      assignment_role: assignmentRole,
      stage: currentStage as 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE',
    });

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Failed to add assignment',
        description: result.error,
      });
    } else {
      toast({
        title: 'Assignment added',
        description: `User has been assigned as ${assignmentRole.toLowerCase()} owner.`,
      });
      handleClose();
      onSuccess();
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedUserId('');
      setAssignmentRole('SECONDARY');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Assignment
          </DialogTitle>
          <DialogDescription>
            Assign a user to <strong>{contactName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="assigned-to">Assign To *</Label>
            {isLoadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="text-sm text-muted-foreground py-2">
                No available users to assign.
              </div>
            ) : (
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
              >
                <SelectTrigger id="assigned-to">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} {user.email ? `(${user.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Assignment Role *</Label>
            <RadioGroup
              value={assignmentRole}
              onValueChange={(val) => setAssignmentRole(val as 'PRIMARY' | 'SECONDARY')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PRIMARY" id="role-primary" />
                <Label htmlFor="role-primary" className="font-normal cursor-pointer">
                  Primary
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="SECONDARY" id="role-secondary" />
                <Label htmlFor="role-secondary" className="font-normal cursor-pointer">
                  Secondary
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Primary owners can change stages. Secondary owners have read access and can add interactions.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedUserId || users.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Assignment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
