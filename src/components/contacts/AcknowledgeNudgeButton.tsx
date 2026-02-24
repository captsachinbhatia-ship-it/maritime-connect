import { useState } from 'react';
import { useCrmUser } from '@/hooks/useCrmUser';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { createInteraction } from '@/services/interactions';

interface AcknowledgeNudgeButtonProps {
  contactId: string;
  contactName: string;
  onSuccess: () => void;
}

export function AcknowledgeNudgeButton({
  contactId,
  contactName,
  onSuccess,
}: AcknowledgeNudgeButtonProps) {
  const { crmUserId } = useCrmUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAcknowledge = async () => {
    if (!crmUserId) {
      toast({ title: 'Error', description: 'User session not found.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    const result = await createInteraction({
      contact_id: contactId,
      user_id: crmUserId,
      interaction_type: 'NOTE',
      outcome: null,
      subject: '[ACK] Backup accepted',
      notes: 'Secondary accepted backup request.',
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
      title: 'Acknowledged',
      description: `You've accepted the backup request for ${contactName}.`,
    });

    setIsOpen(false);
    onSuccess();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          Acknowledge
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Acknowledge Backup Request</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm that you accept the backup request for <strong>{contactName}</strong>. This will
            be logged as an interaction visible to the Primary owner.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleAcknowledge} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Acknowledging...
              </>
            ) : (
              'Acknowledge'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
