import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2, Clock, AlertCircle, Loader2, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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

interface PendingNudge {
  followup_id: string;
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  followup_type: string;
  followup_reason: string | null;
  notes: string | null;
  due_at: string;
  status: string;
  display_status: string;
  created_by_name: string | null;
  acknowledged_at: string | null;
}

export function PendingNudges() {
  const [nudges, setNudges] = useState<PendingNudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [confirmNudge, setConfirmNudge] = useState<PendingNudge | null>(null);

  const loadPendingNudges = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_my_pending_nudges')
      .select('*')
      .order('due_at', { ascending: true });

    if (error) {
      console.error('Failed to load nudges:', error);
    } else {
      setNudges(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPendingNudges();
  }, [loadPendingNudges]);

  async function handleAcknowledge(nudge: PendingNudge) {
    setAcknowledging(nudge.followup_id);
    try {
      const { error } = await supabase.rpc('acknowledge_nudge', {
        p_followup_id: nudge.followup_id,
      });
      if (error) throw error;
      toast({ title: 'Acknowledged', description: 'Follow-up acknowledged. Primary contact owner notified.' });
      loadPendingNudges();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to Acknowledge', description: error.message });
    } finally {
      setAcknowledging(null);
      setConfirmNudge(null);
    }
  }

  function getStatusBadge(status: string) {
    if (status === 'ACKNOWLEDGED') {
      return (
        <Badge variant="secondary" className="text-xs">
          <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-600" />
          Acknowledged
        </Badge>
      );
    }
    if (status === 'OVERDUE') {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="mr-1 h-3 w-3" />
          Overdue
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        <Clock className="mr-1 h-3 w-3 text-amber-600" />
        Pending
      </Badge>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Bell className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <CardTitle className="text-base">Pending Follow-ups</CardTitle>
            <Badge className="ml-auto" variant="secondary">{loading ? '…' : nudges.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : nudges.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4 tabular-nums">0 pending follow-ups</p>
          ) : (
            <div className="space-y-3">
              {nudges.map((nudge) => (
                <div
                  key={nudge.followup_id}
                  className="rounded-lg border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{nudge.contact_name}</p>
                      {nudge.company_name && (
                        <p className="text-xs text-muted-foreground">{nudge.company_name}</p>
                      )}
                    </div>
                    {getStatusBadge(nudge.display_status)}
                  </div>

                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p><span className="font-medium text-foreground">Type:</span> {nudge.followup_type?.replace(/_/g, ' ')}</p>
                    {nudge.followup_reason && (
                      <p><span className="font-medium text-foreground">Reason:</span> {nudge.followup_reason}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>From: {nudge.created_by_name || 'Unknown'}</span>
                    <span>Due: {formatDistanceToNow(new Date(nudge.due_at), { addSuffix: true })}</span>
                  </div>

                  {nudge.status === 'OPEN' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      disabled={acknowledging === nudge.followup_id}
                      onClick={() => setConfirmNudge(nudge)}
                    >
                      {acknowledging === nudge.followup_id ? (
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3 w-3" />
                      )}
                      Acknowledge
                    </Button>
                  )}

                  {nudge.acknowledged_at && (
                    <p className="text-xs text-emerald-600 text-center">
                      ✓ Acknowledged {formatDistanceToNow(new Date(nudge.acknowledged_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmNudge} onOpenChange={(open) => !open && setConfirmNudge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acknowledge Follow-up</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you accept the follow-up request for{' '}
              <strong>{confirmNudge?.contact_name}</strong>. The Primary owner will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!acknowledging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmNudge && handleAcknowledge(confirmNudge)}
              disabled={!!acknowledging}
            >
              {acknowledging ? (
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
    </>
  );
}
