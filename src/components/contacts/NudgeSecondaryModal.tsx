import { useState } from 'react';
import { Loader2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { createInteraction } from '@/services/interactions';

interface NudgeSecondaryModalProps {
  contactId: string;
  contactName: string;
  secondaryOwnerName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NudgeSecondaryModal({
  contactId,
  contactName,
  secondaryOwnerName,
  isOpen,
  onClose,
  onSuccess,
}: NudgeSecondaryModalProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const notesText = note.trim()
      ? `Primary requests Secondary ${secondaryOwnerName} to follow up. Note: ${note.trim()}`
      : `Primary requests Secondary ${secondaryOwnerName} to follow up.`;

    const result = await createInteraction({
      contact_id: contactId,
      interaction_type: 'NOTE',
      outcome: null,
      subject: '[NUDGE] Backup requested',
      notes: notesText,
      interaction_at: new Date().toISOString(),
    });

    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Secondary nudged',
      description: `${secondaryOwnerName} has been notified for backup on ${contactName}.`,
    });

    setNote('');
    onSuccess();
    onClose();
  };

  const handleClose = () => {
    setNote('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Nudge Secondary Owner
          </DialogTitle>
          <DialogDescription>
            Request <strong>{secondaryOwnerName}</strong> to provide backup support for{' '}
            <strong>{contactName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nudge-note">Optional Note</Label>
            <Textarea
              id="nudge-note"
              placeholder="Add context for the secondary owner..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Send Nudge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
