import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Bell, ExternalLink, CheckCircle2, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { getUserNames } from '@/services/interactions';
import { createInteraction } from '@/services/interactions';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { ContactWithCompany } from '@/types';
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
  contactId: string;
  contactName: string;
  primaryOwnerId: string | null;
  primaryOwnerName: string;
  nudgeTime: string;
  nudgeNotes: string | null;
}

interface PendingNudgesProps {
  onContactClick: (contact: ContactWithCompany) => void;
}

export function PendingNudges({ onContactClick }: PendingNudgesProps) {
  const [nudges, setNudges] = useState<PendingNudge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [confirmContact, setConfirmContact] = useState<PendingNudge | null>(null);

  const fetchNudges = useCallback(async () => {
    setIsLoading(true);

    try {
      // Get current user's CRM ID
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();

      if (crmError || !currentCrmUserId) {
        setNudges([]);
        setIsLoading(false);
        return;
      }

      // Get contacts where current user is SECONDARY owner
      const { data: secondaryAssignments, error: secondaryError } = await supabase
        .from('contact_assignments')
        .select('contact_id')
        .eq('status', 'ACTIVE')
        .eq('assigned_to_crm_user_id', currentCrmUserId)
        .eq('assignment_role', 'SECONDARY');

      if (secondaryError || !secondaryAssignments?.length) {
        setNudges([]);
        setIsLoading(false);
        return;
      }

      const contactIds = secondaryAssignments.map(a => a.contact_id);

      // Get all NUDGE and ACK interactions for these contacts
      const { data: interactions, error: interactionsError } = await supabase
        .from('v_contact_interactions_timeline')
        .select('contact_id, subject, notes, interaction_at')
        .in('contact_id', contactIds)
        .or('subject.ilike.[NUDGE]%,subject.ilike.[ACK]%')
        .order('interaction_at', { ascending: false });

      if (interactionsError) {
        console.error('Failed to fetch nudge interactions:', interactionsError);
        setNudges([]);
        setIsLoading(false);
        return;
      }

      // For each contact, find the latest NUDGE and check if there's an ACK after it
      const pendingNudgeContacts: { contactId: string; nudgeTime: string; nudgeNotes: string | null }[] = [];
      const processedContacts = new Set<string>();

      for (const interaction of interactions || []) {
        if (processedContacts.has(interaction.contact_id)) continue;
        processedContacts.add(interaction.contact_id);

        const subject = (interaction.subject || '').toUpperCase();
        
        // If the latest relevant interaction is a NUDGE, it's pending
        if (subject.startsWith('[NUDGE]')) {
          pendingNudgeContacts.push({
            contactId: interaction.contact_id,
            nudgeTime: interaction.interaction_at,
            nudgeNotes: interaction.notes,
          });
        }
        // If the latest is an ACK, the nudge has been acknowledged (skip)
      }

      if (pendingNudgeContacts.length === 0) {
        setNudges([]);
        setIsLoading(false);
        return;
      }

      // Get contact details
      const pendingContactIds = pendingNudgeContacts.map(n => n.contactId);
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, full_name')
        .in('id', pendingContactIds);

      const contactNameMap: Record<string, string> = {};
      (contacts || []).forEach(c => {
        contactNameMap[c.id] = c.full_name || 'Unknown';
      });

      // Get PRIMARY owner for each contact
      const { data: primaryAssignments } = await supabase
        .from('contact_assignments')
        .select('contact_id, assigned_to_crm_user_id')
        .in('contact_id', pendingContactIds)
        .eq('status', 'ACTIVE')
        .eq('assignment_role', 'PRIMARY');

      const primaryOwnerMap: Record<string, string | null> = {};
      (primaryAssignments || []).forEach(a => {
        primaryOwnerMap[a.contact_id] = a.assigned_to_crm_user_id;
      });

      // Get primary owner names
      const primaryOwnerIds = Object.values(primaryOwnerMap).filter(Boolean) as string[];
      let ownerNamesMap: Record<string, string> = {};
      if (primaryOwnerIds.length > 0) {
        const namesResult = await getUserNames(primaryOwnerIds);
        if (namesResult.data) {
          ownerNamesMap = namesResult.data;
        }
      }

      // Build final nudges list
      const nudgesList: PendingNudge[] = pendingNudgeContacts.map(n => ({
        contactId: n.contactId,
        contactName: contactNameMap[n.contactId] || 'Unknown',
        primaryOwnerId: primaryOwnerMap[n.contactId] || null,
        primaryOwnerName: primaryOwnerMap[n.contactId]
          ? ownerNamesMap[primaryOwnerMap[n.contactId]!] || 'Unknown'
          : 'Unassigned',
        nudgeTime: n.nudgeTime,
        nudgeNotes: n.nudgeNotes,
      }));

      // Sort by most recent nudge first
      nudgesList.sort((a, b) => new Date(b.nudgeTime).getTime() - new Date(a.nudgeTime).getTime());

      setNudges(nudgesList);
    } catch (error) {
      console.error('Failed to fetch nudges:', error);
      setNudges([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNudges();
  }, [fetchNudges]);

  const handleAcknowledge = async (nudge: PendingNudge) => {
    setAcknowledging(nudge.contactId);

    const result = await createInteraction({
      contact_id: nudge.contactId,
      interaction_type: 'NOTE',
      outcome: null,
      subject: '[ACK] Backup accepted',
      notes: 'Secondary acknowledged and will follow up.',
      interaction_at: new Date().toISOString(),
    });

    setAcknowledging(null);
    setConfirmContact(null);

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
      description: `You've accepted the backup request for ${nudge.contactName}.`,
    });

    // Refetch nudges
    fetchNudges();
  };

  const handleOpenContact = (nudge: PendingNudge) => {
    onContactClick({
      id: nudge.contactId,
      full_name: nudge.contactName,
    } as ContactWithCompany);
  };

  const truncateNotes = (notes: string | null, maxLength: number = 80) => {
    if (!notes) return '';
    if (notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + '...';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Nudges</CardTitle>
            <CardDescription>Backup requests from Primary owners</CardDescription>
          </div>
          {!isLoading && nudges.length > 0 && (
            <Badge className="ml-auto bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
              {nudges.length} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : nudges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">No nudges pending</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nudges.map((nudge) => (
              <div
                key={nudge.contactId}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{nudge.contactName}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {formatDistanceToNow(new Date(nudge.nudgeTime), { addSuffix: true })}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>From: {nudge.primaryOwnerName}</span>
                  </div>
                  {nudge.nudgeNotes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {truncateNotes(nudge.nudgeNotes)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => handleOpenContact(nudge)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={acknowledging === nudge.contactId}
                    onClick={() => setConfirmContact(nudge)}
                  >
                    {acknowledging === nudge.contactId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Acknowledge
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmContact} onOpenChange={(open) => !open && setConfirmContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Acknowledge Backup Request</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm that you accept the backup request for{' '}
              <strong>{confirmContact?.contactName}</strong>. This will be logged as an interaction
              visible to the Primary owner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!acknowledging}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmContact && handleAcknowledge(confirmContact)}
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
    </Card>
  );
}
