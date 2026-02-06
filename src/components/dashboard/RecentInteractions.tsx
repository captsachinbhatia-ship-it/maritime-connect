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
}

const typeIcons: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Video,
  WHATSAPP: MessageSquare,
  NOTE: StickyNote,
};

export function RecentInteractions() {
  const [interactions, setInteractions] = useState<RecentInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentInteractions = async () => {
      setIsLoading(true);
      try {
        const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
        if (crmError || !currentCrmUserId) {
          setInteractions([]);
          setIsLoading(false);
          return;
        }

        const { data: assignments } = await supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('status', 'ACTIVE')
          .eq('assigned_to_crm_user_id', currentCrmUserId)
          .in('assignment_role', ['PRIMARY', 'SECONDARY']);

        const contactIds = [...new Set(assignments?.map(a => a.contact_id) || [])];

        if (contactIds.length === 0) {
          setInteractions([]);
          setIsLoading(false);
          return;
        }

        const { data: interactionsData } = await supabase
          .from('v_contact_interactions_timeline')
          .select('id, contact_id, interaction_type, interaction_at, subject')
          .in('contact_id', contactIds)
          .order('interaction_at', { ascending: false })
          .limit(5);

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
        })));
      } catch (error) {
        console.error('Failed to fetch recent interactions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecentInteractions();
  }, []);

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
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : interactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No recent interactions</p>
        ) : (
          <div className="space-y-2">
            {interactions.map((interaction) => {
              const Icon = typeIcons[interaction.interaction_type] || MessageSquare;
              return (
                <div
                  key={interaction.id}
                  className="flex items-center gap-3 rounded-lg border p-2.5"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{interaction.contact_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[11px] py-0">
                        {interaction.interaction_type}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
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
