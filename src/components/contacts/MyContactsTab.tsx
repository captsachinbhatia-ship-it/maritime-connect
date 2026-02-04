import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Loader2, PhoneCall, Mail, Video, MessageSquare, FileEdit, CalendarClock, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StageRequestModal } from './StageRequestModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentCrmUserId } from '@/services/profiles';
import { getCompanyNamesMap } from '@/services/contacts';
import { getNextFollowupDueMap, getFollowupStatusLabel } from '@/services/followups';
import { ContactDetailsDrawer } from './ContactDetailsDrawer';
import { ContactsSearch } from './ContactsSearch';
import { ContactWithCompany } from '@/types';
import { useToast } from '@/hooks/use-toast';

type StageType = 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

const STAGES: { value: StageType; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const STAGE_COLORS: Record<StageType, string> = {
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

const FOLLOWUP_STATUS_STYLES: Record<string, string> = {
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  DUE_TODAY: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  UPCOMING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

interface ContactWithRole extends ContactWithCompany {
  userRole: 'PRIMARY' | 'SECONDARY';
}

export function MyContactsTab() {
  const { session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeStage, setActiveStage] = useState<StageType>('ASPIRATION');
  const [contacts, setContacts] = useState<ContactWithRole[]>([]);
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [nextFollowupMap, setNextFollowupMap] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStage, setIsUpdatingStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Drawer state
  const [selectedContact, setSelectedContact] = useState<ContactWithRole | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Stage request modal state
  const [stageRequestContact, setStageRequestContact] = useState<ContactWithRole | null>(null);
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

      // Step 1: Get all ACTIVE assignments where the current user is PRIMARY or SECONDARY
      const { data: userAssignments, error: userAssignmentError } = await supabase
        .from('contact_assignments')
        .select('contact_id, assignment_role')
        .eq('status', 'ACTIVE')
        .eq('assigned_to_crm_user_id', currentCrmUserId)
        .in('assignment_role', ['PRIMARY', 'SECONDARY']);

      if (userAssignmentError) {
        setError(userAssignmentError.message);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Build map of contact_id -> user's role
      const userRoleMap: Record<string, 'PRIMARY' | 'SECONDARY'> = {};
      (userAssignments || []).forEach(a => {
        // If user is both PRIMARY and SECONDARY (shouldn't happen), prefer PRIMARY
        if (!userRoleMap[a.contact_id] || a.assignment_role === 'PRIMARY') {
          userRoleMap[a.contact_id] = a.assignment_role as 'PRIMARY' | 'SECONDARY';
        }
      });

      const contactIdsWithUser = Object.keys(userRoleMap);

      if (contactIdsWithUser.length === 0) {
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Step 2: Get the PRIMARY assignments for these contacts to determine stage (source of truth)
      const { data: primaryAssignments, error: primaryError } = await supabase
        .from('contact_assignments')
        .select('contact_id, stage')
        .in('contact_id', contactIdsWithUser)
        .eq('status', 'ACTIVE')
        .eq('assignment_role', 'PRIMARY');

      if (primaryError) {
        setError(primaryError.message);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Build map of contact_id -> stage from PRIMARY assignment
      const stageMap: Record<string, string> = {};
      (primaryAssignments || []).forEach(a => {
        stageMap[a.contact_id] = a.stage;
      });

      // Filter contacts that are in the active stage
      const contactIdsInStage = contactIdsWithUser.filter(id => stageMap[id] === activeStage);

      if (contactIdsInStage.length === 0) {
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Step 3: Fetch contacts
      let contactsQuery = supabase
        .from('contacts')
        .select(`
          id,
          full_name,
          company_id,
          designation,
          country_code,
          phone,
          phone_type,
          email,
          ice_handle,
          preferred_channel,
          notes,
          is_active,
          updated_at
        `)
        .in('id', contactIdsInStage)
        .order('full_name', { ascending: true });

      if (search.trim()) {
        contactsQuery = contactsQuery.ilike('full_name', `%${search.trim()}%`);
      }

      const { data: contactsData, error: contactsError } = await contactsQuery;

      if (contactsError) {
        setError(contactsError.message);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Add user role to each contact
      let contactsList = (contactsData || []).map(c => ({
        ...c,
        userRole: userRoleMap[c.id],
      })) as ContactWithRole[];

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

      // Fetch next follow-up dates
      const contactIdsForFollowups = contactsList.map(c => c.id);
      if (contactIdsForFollowups.length > 0) {
        const followupResult = await getNextFollowupDueMap(contactIdsForFollowups);
        if (followupResult.data) {
          setNextFollowupMap(followupResult.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [activeStage, search, session]);

  useEffect(() => {
    if (!authLoading) {
      loadContacts();
    }
  }, [loadContacts, authLoading]);

  const handleStageUpdate = async (contactId: string, newStage: StageType) => {
    setIsUpdatingStage(contactId);

    try {
      // Get current CRM user ID
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
      if (crmError || !currentCrmUserId) {
        toast({
          variant: 'destructive',
          title: 'Failed to update stage',
          description: crmError || 'CRM user not found',
        });
        setIsUpdatingStage(null);
        return;
      }

      // Get all ACTIVE assignments for this contact (could have PRIMARY and SECONDARY)
      const { data: currentAssignments, error: fetchError } = await supabase
        .from('contact_assignments')
        .select('id, assigned_to_crm_user_id, assignment_role')
        .eq('contact_id', contactId)
        .eq('status', 'ACTIVE');

      if (fetchError) {
        toast({
          variant: 'destructive',
          title: 'Failed to update stage',
          description: fetchError.message,
        });
        setIsUpdatingStage(null);
        return;
      }

      if (!currentAssignments || currentAssignments.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Failed to update stage',
          description: 'No active assignment found for this contact.',
        });
        setIsUpdatingStage(null);
        return;
      }

      // Close all existing ACTIVE rows
      const { error: closeError } = await supabase
        .from('contact_assignments')
        .update({ status: 'CLOSED' })
        .eq('contact_id', contactId)
        .eq('status', 'ACTIVE');

      if (closeError) {
        if (closeError.message.includes('row-level security')) {
          toast({
            variant: 'destructive',
            title: 'Permission denied',
            description: 'You do not have permission to update this contact\'s stage.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to update stage',
            description: closeError.message,
          });
        }
        setIsUpdatingStage(null);
        return;
      }

      const now = new Date().toISOString();

      // Insert new ACTIVE rows for each assignment (preserving owners)
      const insertPayloads = currentAssignments.map(assignment => ({
        contact_id: contactId,
        assigned_to_crm_user_id: assignment.assigned_to_crm_user_id,
        assigned_by_crm_user_id: currentCrmUserId,
        assignment_role: assignment.assignment_role,
        stage: newStage,
        status: 'ACTIVE',
        assigned_at: now,
        stage_changed_at: now,
        stage_changed_by_crm_user_id: currentCrmUserId,
      }));

      const { error: insertError } = await supabase
        .from('contact_assignments')
        .insert(insertPayloads);

      if (insertError) {
        if (insertError.message.includes('row-level security')) {
          toast({
            variant: 'destructive',
            title: 'Permission denied',
            description: 'You do not have permission to update this contact\'s stage.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to update stage',
            description: insertError.message,
          });
        }
        setIsUpdatingStage(null);
        return;
      }

      toast({
        title: 'Stage updated',
        description: `Contact moved to ${STAGES.find(s => s.value === newStage)?.label}`,
      });

      // Refresh the list
      loadContacts();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to update stage',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsUpdatingStage(null);
    }
  };

  const handleRowClick = (e: React.MouseEvent, contact: ContactWithRole) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menu"]')) {
      return;
    }
    setSelectedContact(contact);
    setDrawerOpen(true);
  };

  const formatLastInteraction = (contact: ContactWithRole) => {
    if (!contact.last_interaction_at) return null;
    const type = contact.last_interaction_type || '';
    const timeAgo = formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true });
    const outcome = contact.last_interaction_outcome;
    return { type, timeAgo, outcome };
  };

  const getAvailableStages = (currentStage: StageType) => {
    return STAGES.filter(s => s.value !== currentStage);
  };

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Move Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (contacts.length === 0) {
      return (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">No contacts found for this stage.</p>
        </div>
      );
    }

    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Move Stage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const lastInteraction = formatLastInteraction(contact);
              const nextFollowupDue = nextFollowupMap[contact.id] || null;
              const followupStatus = getFollowupStatusLabel(nextFollowupDue);
              const availableStages = getAvailableStages(activeStage);

              return (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer"
                  onClick={(e) => handleRowClick(e, contact)}
                >
                  <TableCell className="font-medium">
                    {contact.full_name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={contact.userRole === 'PRIMARY' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {contact.userRole === 'PRIMARY' ? 'Primary' : 'Secondary'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {contact.company_id ? companyNamesMap[contact.company_id] || '-' : '-'}
                  </TableCell>
                  <TableCell>
                    {nextFollowupDue ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <CalendarClock className="h-3 w-3 text-muted-foreground" />
                          <span>{format(new Date(nextFollowupDue), 'MMM d, h:mm a')}</span>
                        </div>
                        {followupStatus && (
                          <Badge className={`text-xs ${FOLLOWUP_STATUS_STYLES[followupStatus]}`}>
                            {followupStatus.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
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
                    {contact.userRole === 'PRIMARY' ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isUpdatingStage === contact.id}
                            className="h-7"
                          >
                            {isUpdatingStage === contact.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                Move to
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {availableStages.map((stage) => (
                            <DropdownMenuItem
                              key={stage.value}
                              onClick={() => handleStageUpdate(contact.id, stage.value)}
                            >
                              <Badge className={`mr-2 ${STAGE_COLORS[stage.value]}`}>
                                {stage.label}
                              </Badge>
                              Move to {stage.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
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
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeStage} onValueChange={(val) => {
        setActiveStage(val as StageType);
        setSearch('');
      }}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            {STAGES.map((stage) => (
              <TabsTrigger key={stage.value} value={stage.value}>
                {stage.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <ContactsSearch value={search} onChange={setSearch} />
        </div>

        {STAGES.map((stage) => (
          <TabsContent key={stage.value} value={stage.value} className="mt-4">
            {renderTable()}
          </TabsContent>
        ))}
      </Tabs>

      <ContactDetailsDrawer
        contact={selectedContact}
        companyName={selectedContact?.company_id ? companyNamesMap[selectedContact.company_id] || null : null}
        currentStage={activeStage}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedContact(null);
        }}
        onOwnersChange={loadContacts}
        onCompanyChange={(newCompanyId, newCompanyName) => {
          // Update local company names map and refetch contacts
          setCompanyNamesMap(prev => ({ ...prev, [newCompanyId]: newCompanyName }));
          loadContacts();
        }}
      />

      <StageRequestModal
        contactId={stageRequestContact?.id || ''}
        contactName={stageRequestContact?.full_name || 'Unknown'}
        currentStage={activeStage}
        isOpen={stageRequestModalOpen}
        onClose={() => {
          setStageRequestModalOpen(false);
          setStageRequestContact(null);
        }}
        onSuccess={loadContacts}
      />
    </div>
  );
}
