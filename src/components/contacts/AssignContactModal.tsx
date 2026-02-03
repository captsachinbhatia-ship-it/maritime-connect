import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, UserPlus } from 'lucide-react';
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
import { upsertAssignment, AssignmentStage, ContactAssignment } from '@/services/assignments';
import { toast } from '@/hooks/use-toast';

interface AssignContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  currentAssignment: ContactAssignment | null;
  onSuccess: () => void;
}

const STAGES: { value: AssignmentStage; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export function AssignContactModal({
  open,
  onOpenChange,
  contactId,
  contactName,
  currentAssignment,
  onSuccess,
}: AssignContactModalProps) {
  const [crmUsers, setCrmUsers] = useState<CrmUserForAssignment[]>([]);
  const [selectedCrmUserId, setSelectedCrmUserId] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<AssignmentStage>('COLD_CALLING');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCrmUsers();
      // Pre-fill with current assignment if exists
      if (currentAssignment) {
        setSelectedCrmUserId(currentAssignment.assigned_to_crm_user_id || '');
        setSelectedStage(currentAssignment.stage);
      } else {
        setSelectedCrmUserId('');
        setSelectedStage('COLD_CALLING');
      }
    }
  }, [open, currentAssignment]);

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
    if (!selectedCrmUserId) {
      setError('Please select a user to assign');
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await upsertAssignment({
      contact_id: contactId,
      assigned_to_crm_user_id: selectedCrmUserId,
      stage: selectedStage,
    });

    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    toast({
      title: 'Success',
      description: 'Assigned successfully',
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
            <UserPlus className="h-5 w-5" />
            {currentAssignment ? 'Reassign Contact' : 'Assign Contact'}
          </DialogTitle>
          <DialogDescription>
            {currentAssignment ? 'Update assignment for' : 'Assign'} <strong>{contactName}</strong>
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
              <Label>Assign To *</Label>
              <Select value={selectedCrmUserId} onValueChange={setSelectedCrmUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {crmUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {formatUserLabel(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stage *</Label>
              <Select value={selectedStage} onValueChange={(val) => setSelectedStage(val as AssignmentStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <Button onClick={handleSave} disabled={isSaving || isLoading || !selectedCrmUserId}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentAssignment ? 'Update Assignment' : 'Assign Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
