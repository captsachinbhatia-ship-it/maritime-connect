import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircle2, Clock, XCircle, AlertCircle, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MyNudge {
  followup_id: string;
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  followup_type: string;
  followup_reason: string | null;
  assigned_to_name: string | null;
  display_status: string;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
}

export function MyNudges() {
  const [nudges, setNudges] = useState<MyNudge[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMyNudges = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_nudges_i_created')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to load nudges:', error);
    } else {
      setNudges(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMyNudges();
  }, [loadMyNudges]);

  function getStatusIcon(status: string) {
    switch (status) {
      case 'ACKNOWLEDGED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'OVERDUE':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-amber-600" />;
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Send className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-base">Nudges I Sent</CardTitle>
          <Badge className="ml-auto" variant="secondary">{nudges.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : nudges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 tabular-nums">0 nudges sent</p>
        ) : (
          <div className="space-y-2">
            {nudges.map((nudge) => (
              <div
                key={nudge.followup_id}
                className="flex items-start justify-between gap-3 rounded-lg border p-2.5"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(nudge.display_status)}
                    <span className="font-medium truncate text-sm">{nudge.contact_name}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {nudge.followup_type?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    To: {nudge.assigned_to_name || 'Unknown'}
                  </p>
                  {nudge.acknowledged_at && (
                    <p className="text-xs text-emerald-600">
                      ✓ Acknowledged {formatDistanceToNow(new Date(nudge.acknowledged_at), { addSuffix: true })}
                      {nudge.acknowledged_by_name && ` by ${nudge.acknowledged_by_name}`}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(nudge.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
