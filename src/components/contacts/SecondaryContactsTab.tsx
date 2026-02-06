import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { PhoneCall, Mail, Video, MessageSquare, FileEdit, ArrowRight, Users, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentCrmUserId } from '@/services/profiles';
import { getCompanyNamesMap } from '@/services/contacts';
import { getUserNames } from '@/services/interactions';
import { getNudgeStatusMap } from '@/services/nudgeStatus';
import { ContactsSearch } from './ContactsSearch';
import { StageRequestModal } from './StageRequestModal';
import { AcknowledgeNudgeButton } from './AcknowledgeNudgeButton';
import { ContactWithCompany } from '@/types';

type StageType = 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

const STAGE_LABELS: Record<string, string> = {
  COLD_CALLING: 'Cold Calling',
  ASPIRATION: 'Aspiration',
  ACHIEVEMENT: 'Achievement',
  INACTIVE: 'Inactive',
};

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800',
  ASPIRATION: 'bg-amber-100 text-amber-800',
  ACHIEVEMENT: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

const INTERACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-3 w-3" />,
  WHATSAPP: <MessageSquare className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  MEETING: <Video className="h-3 w-3" />,
  NOTE: <FileEdit className="h-3 w-3" />,
};

interface SecondaryContact extends ContactWithCompany {
  stage: string | null;
  primary_owner_id: string | null;
}

export function SecondaryContactsTab() {
  const { session, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<SecondaryContact[]>([]);
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [primaryOwnerNamesMap, setPrimaryOwnerNamesMap] = useState<Record<string, string>>({});
  const [nudgeStatusMap, setNudgeStatusMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Stage request modal state
  const [stageRequestContact, setStageRequestContact] = useState<SecondaryContact | null>(null);
  const [stageRequestModalOpen, setStageRequestModalOpen] = useState(false);
  const loadContacts = useCallback(async () => {
    if (!session) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current user's CRM ID
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();

      if (crmError || !currentCrmUserId) {
        setError(crmError || 'CRM user not found');
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Get ACTIVE SECONDARY assignments for the current user
      const { data: secondaryAssignments, error: secondaryError } = await supabase
        .from('contact_assignments')
        .select('contact_id')
        .eq('status', 'ACTIVE')
        .eq('assigned_to_crm_user_id', currentCrmUserId)
        .eq('assignment_role', 'SECONDARY');

      if (secondaryError) {
        setError(secondaryError.message);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      const contactIds = (secondaryAssignments || []).map(a => a.contact_id);

      if (contactIds.length === 0) {
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Get the PRIMARY assignments for these contacts to determine stage and primary owner
      const { data: primaryAssignments, error: primaryError } = await supabase
        .from('contact_assignments')
        .select('contact_id, stage, assigned_to_crm_user_id')
        .in('contact_id', contactIds)
        .eq('status', 'ACTIVE')
        .eq('assignment_role', 'PRIMARY');

      if (primaryError) {
        setError(primaryError.message);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Build stage map and primary owner map
      const stageMap: Record<string, string> = {};
      const primaryOwnerMap: Record<string, string> = {};
      (primaryAssignments || []).forEach(a => {
        stageMap[a.contact_id] = a.stage;
        if (a.assigned_to_crm_user_id) {
          primaryOwnerMap[a.contact_id] = a.assigned_to_crm_user_id;
        }
      });

      // Fetch contacts from the view
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts_with_primary_phone')
        .select('*')
        .in('id', contactIds)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (contactsError) {
        setError(contactsError.message);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      let contactsList = (contactsData || []).map(c => ({
        ...c,
        stage: stageMap[c.id] || null,
        primary_owner_id: primaryOwnerMap[c.id] || null,
      })) as SecondaryContact[];

      // Fetch last interaction data
      if (contactsList.length > 0) {
        const contactIdsForInteraction = contactsList.map(c => c.id);
        const { data: lastInteractionData } = await supabase
          .from('v_contacts_last_interaction')
          .select('contact_id, last_interaction_at, last_interaction_type, last_interaction_outcome')
          .in('contact_id', contactIdsForInteraction);

        if (lastInteractionData && lastInteractionData.length > 0) {
          const liMap: Record<string, { last_interaction_at: string | null; last_interaction_type: string | null; last_interaction_outcome: string | null }> = {};
          lastInteractionData.forEach((li) => {
            liMap[li.contact_id] = {
              last_interaction_at: li.last_interaction_at,
              last_interaction_type: li.last_interaction_type,
              last_interaction_outcome: li.last_interaction_outcome,
            };
          });
          contactsList = contactsList.map(c => ({
            ...c,
            ...liMap[c.id],
          }));
        }
      }

      setContacts(contactsList);

      // Fetch company names
      const companyIds = contactsList
        .map(c => c.company_id)
        .filter((id): id is string => id !== null);

      if (companyIds.length > 0) {
        const namesResult = await getCompanyNamesMap(companyIds);
        if (namesResult.data) {
          setCompanyNamesMap(namesResult.data);
        }
      }

      // Fetch primary owner names
      const primaryOwnerIds = Object.values(primaryOwnerMap).filter(Boolean);
      if (primaryOwnerIds.length > 0) {
        const ownerNamesResult = await getUserNames(primaryOwnerIds);
        if (ownerNamesResult.data) {
          setPrimaryOwnerNamesMap(ownerNamesResult.data);
        }
      }
      // Fetch nudge status for all contacts
      if (contactIds.length > 0) {
        const nudgeResult = await getNudgeStatusMap(contactIds);
        if (nudgeResult.data) {
          setNudgeStatusMap(nudgeResult.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading) {
      loadContacts();
    }
  }, [loadContacts, authLoading]);

  // Client-side search filter
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const searchLower = search.toLowerCase().trim();
    return contacts.filter(contact => {
      const fullName = (contact.full_name || '').toLowerCase();
      const companyName = contact.company_id ? (companyNamesMap[contact.company_id] || '').toLowerCase() : '';
      const email = (contact.email || '').toLowerCase();
      const phone = (contact.primary_phone || '').toLowerCase();
      return fullName.includes(searchLower) || 
             companyName.includes(searchLower) || 
             email.includes(searchLower) || 
             phone.includes(searchLower);
    });
  }, [contacts, search, companyNamesMap]);

  // Row click disabled for secondary contacts to protect private details

  const formatLastInteraction = (contact: SecondaryContact) => {
    if (!contact.last_interaction_at) return null;
    const type = contact.last_interaction_type || '';
    const timeAgo = formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true });
    const outcome = contact.last_interaction_outcome;
    return { type, timeAgo, outcome };
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Users className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Secondary Contacts</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading...' : `${filteredContacts.length} contacts where you are secondary owner`}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadContacts} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-4">
            <ContactsSearch value={search} onChange={setSearch} />
          </div>

          {isLoading ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Primary Owner</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {search.trim() ? 'No contacts match your search.' : 'No secondary contacts assigned to you.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Primary Owner</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => {
                    const lastInteraction = formatLastInteraction(contact);
                    const primaryOwnerName = contact.primary_owner_id 
                      ? primaryOwnerNamesMap[contact.primary_owner_id] || 'Unknown'
                      : 'Unassigned';
                    const hasActiveNudge = nudgeStatusMap[contact.id] || false;

                    return (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span>{contact.full_name || '-'}</span>
                            {hasActiveNudge && (
                              <Badge className="w-fit text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                                <Bell className="mr-1 h-3 w-3" />
                                Backup requested
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{primaryOwnerName}</span>
                        </TableCell>
                        <TableCell>
                          {contact.company_id ? (
                            <Badge variant="secondary">
                              {companyNamesMap[contact.company_id] || '-'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.stage ? (
                            <Badge className={STAGE_COLORS[contact.stage] || ''}>
                              {STAGE_LABELS[contact.stage] || contact.stage}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lastInteraction ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {INTERACTION_TYPE_ICONS[lastInteraction.type] || null}
                                <span>{lastInteraction.type}</span>
                              </span>
                              <span>·</span>
                              <span>{lastInteraction.timeAgo}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {hasActiveNudge && (
                              <AcknowledgeNudgeButton
                                contactId={contact.id}
                                contactName={contact.full_name || 'Unknown'}
                                onSuccess={loadContacts}
                              />
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStageRequestContact(contact);
                                setStageRequestModalOpen(true);
                              }}
                            >
                              Request Move
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <StageRequestModal
        contactId={stageRequestContact?.id || ''}
        contactName={stageRequestContact?.full_name || 'Unknown'}
        currentStage={stageRequestContact?.stage as StageType || 'ASPIRATION'}
        isOpen={stageRequestModalOpen}
        onClose={() => {
          setStageRequestModalOpen(false);
          setStageRequestContact(null);
        }}
        onSuccess={loadContacts}
      />
    </>
  );
}
