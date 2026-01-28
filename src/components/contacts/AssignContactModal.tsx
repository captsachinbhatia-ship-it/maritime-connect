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
import { useAuth } from '@/contexts/AuthContext';
import { listProfilesForAssignment, Profile } from '@/services/profiles';
import { upsertAssignment, AssignmentStage, ContactAssignment } from '@/services/assignments';

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
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<AssignmentStage>('ASPIRATION');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadProfiles();
      // Pre-fill with current assignment if exists
      if (currentAssignment) {
        setSelectedUserId(currentAssignment.assigned_to || '');
        setSelectedStage(currentAssignment.stage);
      } else {
        setSelectedUserId('');
        setSelectedStage('ASPIRATION');
      }
    }
  }, [open, currentAssignment]);

  const loadProfiles = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await listProfilesForAssignment();
    
    if (result.error) {
      setError(result.error);
    } else {
      setProfiles(result.data || []);
    }
    
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!user) {
      setError('You must be logged in to assign contacts');
      return;
    }

    if (!selectedUserId) {
      setError('Please select a user to assign');
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await upsertAssignment({
      contact_id: contactId,
      assigned_to: selectedUserId,
      stage: selectedStage,
      currentUserId: user.id,
    });

    if (result.error) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

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
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || 'Unknown'} 
                      {profile.role && (
                        <span className="ml-2 text-muted-foreground">({profile.role})</span>
                      )}
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
          <Button onClick={handleSave} disabled={isSaving || isLoading || !selectedUserId}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {currentAssignment ? 'Update Assignment' : 'Assign Contact'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
