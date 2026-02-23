import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { useCrmUser } from '@/hooks/useCrmUser';
import { MessageSquare, Phone, Mail, Video, StickyNote, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface RecentInteraction {
  id: string;
  contact_id: string;
  contact_name: string;
  interaction_type: string;
  interaction_at: string;
  subject: string | null;
  notes: string | null;
  outcome: string | null;
  creator_name: string | null;
}

const typeIcons: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Video,
  WHATSAPP: MessageSquare,
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
  const navigate = useNavigate();
  const [interactions, setInteractions] = useState<RecentInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useRpc, setUseRpc] = useState(true);

  const effectiveUserId = crmUserIdProp === undefined ? currentCrmUserId : crmUserIdProp;

  useEffect(() => {
    const fetchRecentInteractions = async () => {
      setIsLoading(true);
      try {
        // Try RPC first for ownership-aware fetching
        if (effectiveUserId && useRpc) {
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('get_my_recent_interactions', {
              p_crm_user_id: effectiveUserId,
              p_limit: 20,
            });

          if (!rpcError && rpcData) {
            setInteractions(rpcData.map((r: any) => ({
              id: r.id,
              contact_id: r.contact_id,
              contact_name: r.contact_name || 'Unknown',
              interaction_type: r.interaction_type,
              interaction_at: r.interaction_at,
              subject: r.subject || null,
              notes: r.notes || null,
              outcome: r.outcome || null,
              creator_name: r.creator_name || null,
            })));
            setIsLoading(false);
            return;
          }
          // RPC not available, fall back
          if (rpcError) {
            console.warn('RPC get_my_recent_interactions not available, falling back:', rpcError.message);
            setUseRpc(false);
          }
        }

        // Fallback: existing assignment-based logic
        if (!effectiveUserId) {
          setInteractions([]);
          setIsLoading(false);
          return;
        }

        const { data: assignments } = await supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('assigned_to_crm_user_id', effectiveUserId)
          .eq('status', 'ACTIVE')
          .in('assignment_role', ['primary', 'secondary']);

        const contactIds = [...new Set(assignments?.map(a => a.contact_id) || [])];
        if (contactIds.length === 0) {
          setInteractions([]);
          setIsLoading(false);
          return;
        }

        const { data: interactionsData } = await supabase
          .from('v_contact_interactions_timeline')
          .select('id, contact_id, interaction_type, interaction_at, subject, notes, outcome, creator_full_name')
          .in('contact_id', contactIds.slice(0, 500))
          .order('interaction_at', { ascending: false })
          .limit(20);

        if (!interactionsData || interactionsData.length === 0) {
          setInteractions([]);
          setIsLoading(false);
          return;
        }

        const uniqueContactIds = [...new Set(interactionsData.map(i => i.contact_id))];
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, full_name')
          .in('id', uniqueContactIds);

        const contactMap = new Map(contacts?.map(c => [c.id, c.full_name || 'Unknown']) || []);

        setInteractions(interactionsData.map(i => ({
          ...i,
          contact_name: contactMap.get(i.contact_id) || 'Unknown',
          notes: i.notes || null,
          outcome: i.outcome || null,
          creator_name: (i as any).creator_full_name || null,
        })));
      } catch (error) {
        console.error('Failed to fetch recent interactions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecentInteractions();
  }, [effectiveUserId, useRpc]);

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
          {!isLoading && interactions.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {interactions.length} total
            </Badge>
          )}
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
            <Button variant="outline" size="sm" onClick={() => navigate('/contacts-v2')}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Log Interaction
            </Button>
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
                  className="flex items-start gap-3 rounded-lg border p-2.5"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{interaction.contact_name}</p>
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
    </Card>
  );
}
