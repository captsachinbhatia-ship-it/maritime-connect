import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { MessageSquare, Phone, Mail, Video, StickyNote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentInteraction {
  id: string;
  contact_id: string;
  contact_name: string;
  interaction_type: string;
  interaction_at: string;
  subject: string | null;
  notes: string | null;
  outcome: string | null;
}

const typeIcons: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Video,
  WHATSAPP: MessageSquare,
  NOTE: StickyNote,
};

// Keywords that indicate commercial info worth highlighting
const COMMERCIAL_KEYWORDS = ['subs', 'sub', 'rate', 'rates', 'freight', 'hire', 'fixture', 'offer'];

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
  const [interactions, setInteractions] = useState<RecentInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentInteractions = async () => {
      setIsLoading(true);
      try {
        let userId: string | null = null;

        if (crmUserIdProp === undefined) {
          const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
          if (crmError || !currentCrmUserId) {
            setInteractions([]);
            setIsLoading(false);
            return;
          }
          userId = currentCrmUserId;
        } else {
          userId = crmUserIdProp;
        }

        let assignQuery = supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('status', 'ACTIVE')
          .in('assignment_role', ['PRIMARY', 'SECONDARY']);

        if (userId) {
          assignQuery = assignQuery.eq('assigned_to_crm_user_id', userId);
        }

        const { data: assignments } = await assignQuery;
        const contactIds = [...new Set(assignments?.map(a => a.contact_id) || [])];

        if (contactIds.length === 0) {
          setInteractions([]);
          setIsLoading(false);
          return;
        }

        const { data: interactionsData } = await supabase
          .from('v_contact_interactions_timeline')
          .select('id, contact_id, interaction_type, interaction_at, subject, notes, outcome')
          .in('contact_id', contactIds.slice(0, 500))
          .order('interaction_at', { ascending: false })
          .limit(8);

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
        })));
      } catch (error) {
        console.error('Failed to fetch recent interactions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecentInteractions();
  }, [crmUserIdProp]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-base">Recent Interactions</CardTitle>
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
          <p className="py-6 text-center text-sm text-muted-foreground">No recent interactions</p>
        ) : (
          <div className="space-y-2">
            {interactions.map((interaction) => {
              const Icon = typeIcons[interaction.interaction_type] || MessageSquare;
              const commercialChips = extractCommercialChips(
                (interaction.subject || '') + ' ' + (interaction.notes || '')
              );
              const notesPreview = interaction.notes
                ? interaction.notes.length > 80
                  ? interaction.notes.substring(0, 80) + '…'
                  : interaction.notes
                : null;

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
                      <p className="truncate text-[11px] text-foreground/80 leading-tight mt-0.5">
                        {interaction.subject}
                      </p>
                    )}
                    {notesPreview && (
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                        {notesPreview}
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
