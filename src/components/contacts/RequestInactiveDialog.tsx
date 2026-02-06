import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Ban } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface RequestInactiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  onSuccess?: () => void;
}

export function RequestInactiveDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  onSuccess,
}: RequestInactiveDialogProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequest() {
    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please provide a reason',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.rpc('request_inactive', {
        p_contact_id: contactId,
        p_reason: reason,
      });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: 'Admin will review your request to mark this contact inactive',
      });

      onOpenChange(false);
      setReason('');
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setReason('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Request Inactive Status
          </DialogTitle>
          <DialogDescription>
            Request to mark <strong>{contactName}</strong> as inactive
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Why should this contact be marked inactive?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              An admin will review and approve/reject your request
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRequest} disabled={loading || !reason.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
