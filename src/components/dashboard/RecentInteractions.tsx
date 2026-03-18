import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { useCrmUser } from '@/hooks/useCrmUser';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Phone, Mail, Video, StickyNote, PlusCircle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LogInteractionModal } from '@/components/contacts/LogInteractionModal';

interface RecentInteraction {
  id: string;
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  interaction_type: string;
  interaction_at: string;
  subject: string | null;
  notes: string | null;
  outcome: string | null;
  creator_name: string | null;
}

const typeIcons: Record<string, typeof Phone> = {
  COLD_CALL: Phone,
  CALL: Phone,
  EMAIL_SENT: Mail,
  WHATSAPP_SENT: MessageSquare,
  WHATSAPP_REPLY: MessageSquare,
  MEETING: Video,
  NOTE: StickyNote,
};

// Keywords that indicate commercial info worth highlighting
function extractCommercialChips(text: string | null): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found: string[] = [];
  if (lower.includes('subs') || lower.includes('sub ')) found.push('Subs');
  if (lower.includes('rate') || lower.includes('rates')) found.push('Rates');
  if (lower.includes('freight')) found.push('Freight');
  if (lower.includes('fixture')) found.push('Fixture');
  return [...new Set(found)];
}

interface RecentInteractionsProps {
  /** undefined = logged-in user, null = all users, string = specific user */
  crmUserId?: string | null;
}

export function RecentInteractions({ crmUserId: crmUserIdProp }: RecentInteractionsProps = {}) {
  const { crmUserId: currentCrmUserId } = useCrmUser();
  const { isAdmin } = useAuth();
  
  const [interactions, setInteractions] = useState<RecentInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);

  const effectiveUserId = crmUserIdProp === undefined ? currentCrmUserId : crmUserIdProp;

  const fetchRecentInteractions = useCallback(async () => {
    if (!effectiveUserId && !isAdmin) {
      setInteractions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Query v_interaction_timeline_v2
      const { data, error } = await supabase
        .from('v_interaction_timeline_v2')
        .select('*')
        .order('interaction_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('v_interaction_timeline_v2 error:', error.message);
        setInteractions([]);
        setIsLoading(false);
        return;
      }

      setInteractions((data || []).map((r: any) => ({
        id: r.id,
        contact_id: r.contact_id,
        contact_name: r.contact_name || r.full_name || 'Unknown',
        company_name: r.company_name || null,
        interaction_type: r.interaction_type,
        interaction_at: r.interaction_at,
        subject: r.subject || null,
        notes: r.notes || null,
        outcome: r.outcome || null,
        creator_name: r.creator_full_name || r.creator_name || null,
      })));
    } catch (error) {
      console.error('Failed to fetch recent interactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentInteractions();
  }, [fetchRecentInteractions]);

  // Listen for dashboard refresh events (fired after logging an interaction)
  useEffect(() => {
    const handler = () => fetchRecentInteractions();
    window.addEventListener('dashboard:refresh', handler);
    return () => window.removeEventListener('dashboard:refresh', handler);
  }, [fetchRecentInteractions]);

  const handlePopout = () => {
    window.open('/interactions', '_blank', 'noopener,noreferrer');
  };

  const handleRowOpen = (contactId: string) => {
    window.open(`/contacts?contact=${contactId}&tab=interactions`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-4.5 w-4.5 text-primary" />
            </div>
            <CardTitle className="text-base">Recent Interactions</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && interactions.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {interactions.length} total
              </Badge>
            )}
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => setLogModalOpen(true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              Log Interaction
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePopout} title="Open all interactions">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : interactions.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No interactions logged yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {interactions.map((interaction) => {
              const Icon = typeIcons[interaction.interaction_type] || MessageSquare;
              const commercialChips = extractCommercialChips(
                (interaction.subject || '') + ' ' + (interaction.notes || '')
              );

              return (
                <div
                  key={interaction.id}
                  className="flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowOpen(interaction.contact_id)}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{interaction.contact_name}</p>
                    {interaction.company_name && (
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {interaction.company_name}
                      </p>
                    )}
                    {interaction.subject && (
                      <p className="text-[11px] text-foreground/80 leading-tight mt-0.5">
                        {interaction.subject}
                      </p>
                    )}
                    {interaction.notes && (
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-3">
                        {interaction.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] py-0 h-4">
                        {interaction.interaction_type}
                      </Badge>
                      {interaction.outcome && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          {interaction.outcome}
                        </Badge>
                      )}
                      {commercialChips.map(chip => (
                        <Badge key={chip} variant="default" className="text-[10px] py-0 h-4 bg-amber-500/15 text-amber-700 border-amber-300/50">
                          {chip}
                        </Badge>
                      ))}
                      {interaction.creator_name && (
                        <span className="text-[10px] text-muted-foreground">
                          by {interaction.creator_name}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(interaction.interaction_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <LogInteractionModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSuccess={() => setLogModalOpen(false)}
      />
    </Card>
  );
}
