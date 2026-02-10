import { useState, useEffect } from 'react';
import { Loader2, Users } from 'lucide-react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getActiveCrmUsers } from '@/services/assignPrimary';
import { addAssignment, type AssignmentStage, type AssignmentRole } from '@/services/assignments';
import { useToast } from '@/hooks/use-toast';

interface BulkAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactIds: string[];
  onSuccess: () => void;
}

const STAGES: { value: AssignmentStage; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
];

export function BulkAssignModal({
  open,
  onOpenChange,
  contactIds,
  onSuccess,
}: BulkAssignModalProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string | null }>>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignmentRole, setAssignmentRole] = useState<AssignmentRole>('primary');
  const [selectedStage, setSelectedStage] = useState<AssignmentStage>('COLD_CALLING');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });

  useEffect(() => {
    if (open) {
      loadUsers();
      setSelectedUserId('');
      setAssignmentRole('primary');
      setSelectedStage('COLD_CALLING');
      setError(null);
      setProgress({ current: 0, total: 0, success: 0, failed: 0 });
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
    setProgress({ current: 0, total: contactIds.length, success: 0, failed: 0 });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < contactIds.length; i++) {
      const contactId = contactIds[i];
      
      const result = await addAssignment({
        contact_id: contactId,
        assigned_to_crm_user_id: selectedUserId,
        assignment_role: assignmentRole,
        stage: assignmentRole === 'primary' ? selectedStage : 'COLD_CALLING',
      });

      if (result.error) {
        failed++;
      } else {
        success++;
      }

      setProgress({ current: i + 1, total: contactIds.length, success, failed });
    }

    const assigneeName = users.find(u => u.id === selectedUserId)?.full_name || 'User';

    if (success > 0) {
      toast({
        title: 'Bulk assignment complete',
        description: `✅ ${success} contacts assigned to ${assigneeName}${failed > 0 ? ` • ❌ ${failed} failed` : ''}`,
      });
    } else {
      toast({
        title: 'Assignment failed',
        description: `All ${failed} assignments failed`,
        variant: 'destructive',
      });
    }

    setIsSaving(false);
    onOpenChange(false);
    onSuccess();
  };

  const contactCount = contactIds.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSaving) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Assign Contacts
          </DialogTitle>
          <DialogDescription>
            Assign <strong>{contactCount}</strong> contact{contactCount !== 1 ? 's' : ''} to a team member
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Assignment Role Toggle */}
            <div className="space-y-2">
              <Label>Assignment Type *</Label>
              <ToggleGroup
                type="single"
                value={assignmentRole}
                onValueChange={(val) => {
                  if (val) setAssignmentRole(val as AssignmentRole);
                }}
                className="w-full"
              >
                <ToggleGroupItem
                  value="primary"
                  className="flex-1 h-9 text-sm font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  Primary
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="secondary"
                  className="flex-1 h-9 text-sm font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  Secondary
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-muted-foreground">
                {assignmentRole === 'primary'
                  ? 'Primary owners manage the contact pipeline and can change stages.'
                  : 'Secondary owners have read access and can add interactions.'}
              </p>
            </div>

            {/* Assign To */}
            <div className="space-y-2">
              <Label>Assign To *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stage - only for PRIMARY */}
            {assignmentRole === 'primary' && (
              <div className="space-y-2">
                <Label>Stage *</Label>
                <Select value={selectedStage} onValueChange={(v) => setSelectedStage(v as AssignmentStage)}>
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
            )}

            {/* Progress indicator */}
            {isSaving && progress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Assigning...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
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
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading || !selectedUserId}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              `Assign ${contactCount} Contact${contactCount !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
