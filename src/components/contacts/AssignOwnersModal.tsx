import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { listCrmUsersForAssignment, CrmUserForAssignment } from '@/services/profiles';
import { upsertOwners, ContactOwners } from '@/services/assignments';
import { toast } from '@/hooks/use-toast';

interface AssignOwnersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  currentOwners: ContactOwners | null;
  onSuccess: () => void;
}

const NONE_VALUE = '__none__';

export function AssignOwnersModal({
  open,
  onOpenChange,
  contactId,
  contactName,
  currentOwners,
  onSuccess,
}: AssignOwnersModalProps) {
  const [crmUsers, setCrmUsers] = useState<CrmUserForAssignment[]>([]);
  const [primaryOwnerId, setPrimaryOwnerId] = useState<string>('');
  const [secondaryOwnerId, setSecondaryOwnerId] = useState<string>(NONE_VALUE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCrmUsers();
      // Pre-fill with current owners if exist
      if (currentOwners?.primary) {
        setPrimaryOwnerId(currentOwners.primary.assigned_to_crm_user_id || '');
      } else {
        setPrimaryOwnerId('');
      }
      if (currentOwners?.secondary) {
        setSecondaryOwnerId(currentOwners.secondary.assigned_to_crm_user_id || NONE_VALUE);
      } else {
        setSecondaryOwnerId(NONE_VALUE);
      }
    }
  }, [open, currentOwners]);

  const loadCrmUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await listCrmUsersForAssignment();
    
    if (result.error) {
      setError(result.error);
    } else {
      setCrmUsers(result.data || []);
    }
    
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!primaryOwnerId) {
      setError('Please select a Primary Owner');
      return;
    }

    // Validate same user not selected for both
    if (secondaryOwnerId !== NONE_VALUE && primaryOwnerId === secondaryOwnerId) {
      setError('Primary and Secondary owner cannot be the same user.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await upsertOwners({
      contact_id: contactId,
      primary_owner_id: primaryOwnerId,
      secondary_owner_id: secondaryOwnerId === NONE_VALUE ? null : secondaryOwnerId,
    });

    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    toast({
      title: 'Success',
      description: 'Owners updated successfully.',
    });

    setIsSaving(false);
    onOpenChange(false);
    onSuccess();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
    }
    onOpenChange(newOpen);
  };

  // Format label: full_name (email)
  const formatUserLabel = (user: CrmUserForAssignment): string => {
    if (user.email) {
      return `${user.full_name} (${user.email})`;
    }
    return user.full_name;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Owners
          </DialogTitle>
          <DialogDescription>
            Set Primary and Secondary owners for <strong>{contactName}</strong>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Owner *</Label>
              <Select value={primaryOwnerId} onValueChange={setPrimaryOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select primary owner..." />
                </SelectTrigger>
                <SelectContent>
                  {crmUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {formatUserLabel(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Required. Main contact owner.</p>
            </div>

            <div className="space-y-2">
              <Label>Secondary Owner</Label>
              <Select value={secondaryOwnerId} onValueChange={setSecondaryOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select secondary owner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {crmUsers.map((user) => (
                    <SelectItem 
                      key={user.id} 
                      value={user.id}
                      disabled={user.id === primaryOwnerId}
                    >
                      {formatUserLabel(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Optional. Backup contact owner.</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading || !primaryOwnerId}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Owners
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
