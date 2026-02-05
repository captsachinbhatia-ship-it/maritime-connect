import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { Loader2, MessageSquare, Phone, Mail, Video, StickyNote } from 'lucide-react';
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
        // Get current user's CRM ID for filtering
        const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
        
        if (crmError || !currentCrmUserId) {
          console.error('Failed to get CRM user ID:', crmError);
          setInteractions([]);
          setIsLoading(false);
          return;
        }

        // Fetch only assignments where current user is PRIMARY or SECONDARY owner
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

        // Fetch recent interactions from timeline view (only for my contacts)
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

        // Fetch contact names
        const uniqueContactIds = [...new Set(interactionsData.map(i => i.contact_id))];
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, full_name')
          .in('id', uniqueContactIds);

        const contactMap = new Map(contacts?.map(c => [c.id, c.full_name || 'Unknown']) || []);

        const enriched = interactionsData.map(i => ({
          ...i,
          contact_name: contactMap.get(i.contact_id) || 'Unknown',
        }));

        setInteractions(enriched);
      } catch (error) {
        console.error('Failed to fetch recent interactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentInteractions();
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">My Recent Interactions</CardTitle>
            <CardDescription>Last 5 activities on your assigned contacts</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : interactions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No recent interactions
          </div>
        ) : (
          <div className="space-y-3">
            {interactions.map((interaction) => {
              const Icon = typeIcons[interaction.interaction_type] || MessageSquare;
              return (
                <div
                  key={interaction.id}
                  className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{interaction.contact_name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {interaction.interaction_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
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
