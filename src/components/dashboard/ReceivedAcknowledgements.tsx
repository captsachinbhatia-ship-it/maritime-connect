import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { getUserNames } from '@/services/interactions';
import { formatDistanceToNow } from 'date-fns';

interface ReceivedAck {
  contactId: string;
  contactName: string;
  secondaryUserId: string;
  secondaryUserName: string;
  ackTime: string;
  ackNotes: string | null;
}

export function ReceivedAcknowledgements() {
  const [acks, setAcks] = useState<ReceivedAck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAcks = useCallback(async () => {
    setIsLoading(true);

    try {
      // Get current user's CRM ID
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();

      if (crmError || !currentCrmUserId) {
        setAcks([]);
        setIsLoading(false);
        return;
      }

      // Get contacts where current user is PRIMARY owner
      const { data: primaryAssignments, error: primaryError } = await supabase
        .from('contact_assignments')
        .select('contact_id')
        .eq('status', 'ACTIVE')
        .eq('assigned_to_crm_user_id', currentCrmUserId)
        .eq('assignment_role', 'PRIMARY');

      if (primaryError || !primaryAssignments?.length) {
        setAcks([]);
        setIsLoading(false);
        return;
      }

      const contactIds = primaryAssignments.map(a => a.contact_id);

      // Get all NUDGE and ACK interactions for these contacts
      const { data: interactions, error: interactionsError } = await supabase
        .from('v_contact_interactions_timeline')
        .select('contact_id, subject, notes, interaction_at, created_by_crm_user_id')
        .in('contact_id', contactIds)
        .or('subject.ilike.[NUDGE]%,subject.ilike.[ACK]%')
        .order('interaction_at', { ascending: false });

      if (interactionsError) {
        console.error('Failed to fetch acknowledgement interactions:', interactionsError);
        setAcks([]);
        setIsLoading(false);
        return;
      }

      // For each contact, find if latest relevant interaction is an ACK (after a NUDGE)
      const acknowledgedContacts: { 
        contactId: string; 
        ackTime: string; 
        ackNotes: string | null;
        secondaryUserId: string;
      }[] = [];
      const processedContacts = new Set<string>();

      // Group interactions by contact
      const interactionsByContact: Record<string, typeof interactions> = {};
      for (const interaction of interactions || []) {
        if (!interactionsByContact[interaction.contact_id]) {
          interactionsByContact[interaction.contact_id] = [];
        }
        interactionsByContact[interaction.contact_id].push(interaction);
      }

      // For each contact, check if the latest is an ACK that came after a NUDGE
      for (const contactId of Object.keys(interactionsByContact)) {
        if (processedContacts.has(contactId)) continue;
        processedContacts.add(contactId);

        const contactInteractions = interactionsByContact[contactId];
        if (!contactInteractions || contactInteractions.length === 0) continue;

        // Find the latest interaction
        const latest = contactInteractions[0];
        const latestSubject = (latest.subject || '').toUpperCase();

        // If the latest is an ACK, check if there was a NUDGE before it
        if (latestSubject.startsWith('[ACK]')) {
          // Check if there's any NUDGE in the history (must be before this ACK)
          const hasNudge = contactInteractions.some(i => 
            (i.subject || '').toUpperCase().startsWith('[NUDGE]') &&
            new Date(i.interaction_at) < new Date(latest.interaction_at)
          );

          if (hasNudge && latest.created_by_crm_user_id) {
            acknowledgedContacts.push({
              contactId,
              ackTime: latest.interaction_at,
              ackNotes: latest.notes,
              secondaryUserId: latest.created_by_crm_user_id,
            });
          }
        }
      }

      if (acknowledgedContacts.length === 0) {
        setAcks([]);
        setIsLoading(false);
        return;
      }

      // Get contact details
      const ackContactIds = acknowledgedContacts.map(a => a.contactId);
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name')
        .in('id', ackContactIds);

      const contactNameMap: Record<string, string> = {};
      (contacts || []).forEach(c => {
        contactNameMap[c.id] = c.full_name || 'Unknown';
      });

      // Get secondary user names
      const secondaryUserIds = [...new Set(acknowledgedContacts.map(a => a.secondaryUserId))];
      let secondaryNamesMap: Record<string, string> = {};
      if (secondaryUserIds.length > 0) {
        const namesResult = await getUserNames(secondaryUserIds);
        if (namesResult.data) {
          secondaryNamesMap = namesResult.data;
        }
      }

      // Build final acks list
      const acksList: ReceivedAck[] = acknowledgedContacts.map(a => ({
        contactId: a.contactId,
        contactName: contactNameMap[a.contactId] || 'Unknown',
        secondaryUserId: a.secondaryUserId,
        secondaryUserName: secondaryNamesMap[a.secondaryUserId] || 'Unknown',
        ackTime: a.ackTime,
        ackNotes: a.ackNotes,
      }));

      // Sort by most recent first
      acksList.sort((a, b) => new Date(b.ackTime).getTime() - new Date(a.ackTime).getTime());

      // Only show recent (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentAcks = acksList.filter(a => new Date(a.ackTime) >= sevenDaysAgo);

      setAcks(recentAcks);
    } catch (error) {
      console.error('Failed to fetch acknowledgements:', error);
      setAcks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAcks();
  }, [fetchAcks]);

  const truncateNotes = (notes: string | null, maxLength: number = 80) => {
    if (!notes) return '';
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + '...';
  };

  // Don't render if no acks
  if (!isLoading && acks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Acknowledgements</CardTitle>
            <CardDescription>Backup requests accepted by Secondary owners</CardDescription>
          </div>
          {!isLoading && acks.length > 0 && (
            <Badge className="ml-auto bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              {acks.length} received
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-3">
            {acks.map((ack) => (
              <div
                key={ack.contactId}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{ack.contactName}</span>
                    <Badge variant="outline" className="text-xs shrink-0 text-green-600">
                      {formatDistanceToNow(new Date(ack.ackTime), { addSuffix: true })}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>By: {ack.secondaryUserName}</span>
                  </div>
                  {ack.ackNotes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {truncateNotes(ack.ackNotes)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
