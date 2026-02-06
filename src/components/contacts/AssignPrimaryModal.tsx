import { useState, useEffect } from 'react';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { assignPrimaryContactOwner, getActiveCrmUsers } from '@/services/assignPrimary';

interface AssignPrimaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  onSuccess: (assigneeName: string) => void;
}

const STAGES = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
];

export function AssignPrimaryModal({
  open,
  onOpenChange,
  contactId,
  contactName,
  onSuccess,
}: AssignPrimaryModalProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string | null }>>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStage, setSelectedStage] = useState('COLD_CALLING');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadUsers();
      setSelectedUserId('');
      setSelectedStage('COLD_CALLING');
      setError(null);
    }
  }, [open]);

  const loadUsers = async () => {
    setIsLoading(true);
    const result = await getActiveCrmUsers();
    if (result.error) {
      setError(result.error);
    } else {
      setUsers(result.data || []);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      setError('Please select a user to assign');
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await assignPrimaryContactOwner({
      contactId,
      assigneeCrmUserId: selectedUserId,
      stage: selectedStage,
    });

    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    const assigneeName = users.find(u => u.id === selectedUserId)?.full_name || 'User';
    
    toast({
      title: 'Assignment successful',
      description: `Assigned to ${assigneeName}`,
    });

    setIsSaving(false);
    onOpenChange(false);
    onSuccess(assigneeName);
  };

  const formatUserLabel = (user: { full_name: string; email: string | null }): string => {
    return user.email ? `${user.full_name} (${user.email})` : user.full_name;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSaving) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Primary Owner
          </DialogTitle>
          <DialogDescription>
            Assign a primary owner to <strong>{contactName}</strong>
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
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {formatUserLabel(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stage *</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
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
              <p className="text-xs text-muted-foreground">
                Assignment role is always PRIMARY.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading || !selectedUserId}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
