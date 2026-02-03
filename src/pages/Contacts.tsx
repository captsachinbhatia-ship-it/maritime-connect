import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { AssignContactModal } from '@/components/contacts/AssignContactModal';
import { ContactsSearch } from '@/components/contacts/ContactsSearch';
import { getCompanyNamesMap } from '@/services/contacts';
import { ContactAssignment, ContactOwners, getOwnersForContacts } from '@/services/assignments';
import { getCurrentCrmUserId } from '@/services/profiles';
import { getNextFollowupDueMap } from '@/services/followups';
import { getUserNames } from '@/services/interactions';
import { supabase } from '@/lib/supabaseClient';
import { ContactWithCompany } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type StageType = 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

const STAGES: { value: StageType; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

export default function Contacts() {
  const { session, loading: authLoading } = useAuth();
  const [activeStage, setActiveStage] = useState<StageType>('ASPIRATION');
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, ContactAssignment>>({});
  const [ownersMap, setOwnersMap] = useState<Record<string, ContactOwners>>({});
  const [ownerNamesMap, setOwnerNamesMap] = useState<Record<string, string>>({});
  const [nextFollowupMap, setNextFollowupMap] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState<{
    currentCrmUserId: string | null;
    assignmentRows: number;
    contactRows: number;
    selectedStage: string;
  } | null>(null);
  
  // Drawer state
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [contactToAssign, setContactToAssign] = useState<ContactWithCompany | null>(null);

  const loadContacts = useCallback(async () => {
    // Don't fetch if session not ready
    if (!session) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Resolve current user's CRM ID
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
      
      if (crmError || !currentCrmUserId) {
        console.error('Failed to get CRM user ID:', crmError);
        setError(crmError || 'CRM user not found');
        setDebugInfo({
          currentCrmUserId: null,
          assignmentRows: 0,
          contactRows: 0,
          selectedStage: activeStage,
        });
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Step 2: Query contact_assignments for this user's active assignments in the selected stage
      const { data: assignments, error: assignmentError } = await supabase
        .from('contact_assignments')
        .select('id, contact_id, stage, status, assigned_to_crm_user_id, assigned_by_crm_user_id, stage_changed_by_crm_user_id, assigned_at, stage_changed_at, notes')
        .eq('status', 'ACTIVE')
        .eq('assigned_to_crm_user_id', currentCrmUserId)
        .eq('stage', activeStage);

      if (assignmentError) {
        console.error('Assignment query error:', assignmentError.message);
        setError(assignmentError.message);
        setDebugInfo({
          currentCrmUserId,
          assignmentRows: 0,
          contactRows: 0,
          selectedStage: activeStage,
        });
        setContacts([]);
        setIsLoading(false);
        return;
      }

      const assignmentsList = assignments || [];
      const contactIds = assignmentsList.map(a => a.contact_id);

      // Build assignments map
      const assignmentsById: Record<string, ContactAssignment> = {};
      assignmentsList.forEach(a => {
        assignmentsById[a.contact_id] = a as ContactAssignment;
      });
      setAssignmentsMap(assignmentsById);

      // Debug log
      console.log('[Contacts Debug]', {
        currentCrmUserId,
        assignmentRows: assignmentsList.length,
        selectedStage: activeStage,
        contactIds,
      });

      if (contactIds.length === 0) {
        setDebugInfo({
          currentCrmUserId,
          assignmentRows: 0,
          contactRows: 0,
          selectedStage: activeStage,
        });
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Step 3: Fetch contacts for those contact_ids
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
        .in('id', contactIds)
        .order('full_name', { ascending: true });

      // Apply search filter
      if (search.trim()) {
        contactsQuery = contactsQuery.ilike('full_name', `%${search.trim()}%`);
      }

      const { data: contactsData, error: contactsError } = await contactsQuery;

      if (contactsError) {
        console.error('Contacts query error:', contactsError.message);
        setError(contactsError.message);
        setDebugInfo({
          currentCrmUserId,
          assignmentRows: assignmentsList.length,
          contactRows: 0,
          selectedStage: activeStage,
        });
        setContacts([]);
        setIsLoading(false);
        return;
      }

      let contactsList = (contactsData || []) as ContactWithCompany[];

      // Update debug info
      setDebugInfo({
        currentCrmUserId,
        assignmentRows: assignmentsList.length,
        contactRows: contactsList.length,
        selectedStage: activeStage,
      });

      console.log('[Contacts Debug] Contacts fetched:', contactsList.length);

      // Step 4: Fetch last interaction data from view
      if (contactsList.length > 0) {
        const contactIdsForInteraction = contactsList.map(c => c.id);
        const { data: lastInteractionData } = await supabase
          .from('v_contacts_last_interaction')
          .select('contact_id, last_interaction_at, last_interaction_type, last_interaction_outcome')
          .in('contact_id', contactIdsForInteraction);

        // Merge last interaction data into contacts
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

      // Step 5: Fetch company names
      const companyIds = contactsList
        .map(c => c.company_id)
        .filter((id): id is string => id !== null);

      if (companyIds.length > 0) {
        const namesResult = await getCompanyNamesMap(companyIds);
        if (namesResult.data) {
          setCompanyNamesMap(namesResult.data);
        }
      }

      // Step 6: Fetch next follow-up due dates
      const contactIdsForFollowups = contactsList.map(c => c.id);
      if (contactIdsForFollowups.length > 0) {
        const followupResult = await getNextFollowupDueMap(contactIdsForFollowups);
        if (followupResult.data) {
          setNextFollowupMap(followupResult.data);
        }
      }

      // Step 7: Fetch owners (Primary/Secondary) for all contacts
      const contactIdsForOwners = contactsList.map(c => c.id);
      if (contactIdsForOwners.length > 0) {
        const ownersResult = await getOwnersForContacts(contactIdsForOwners);
        if (ownersResult.data) {
          setOwnersMap(ownersResult.data);
          
          // Collect all unique owner user IDs for name resolution
          const ownerUserIds = new Set<string>();
          Object.values(ownersResult.data).forEach(owners => {
            if (owners.primary?.assigned_to_crm_user_id) {
              ownerUserIds.add(owners.primary.assigned_to_crm_user_id);
            }
            if (owners.secondary?.assigned_to_crm_user_id) {
              ownerUserIds.add(owners.secondary.assigned_to_crm_user_id);
            }
          });
          
          if (ownerUserIds.size > 0) {
            const ownerNamesResult = await getUserNames(Array.from(ownerUserIds));
            if (ownerNamesResult.data) {
              setOwnerNamesMap(ownerNamesResult.data);
            }
          }
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [activeStage, search, session]);

  // Only fetch after auth is ready
  useEffect(() => {
    if (!authLoading) {
      loadContacts();
    }
  }, [loadContacts, authLoading]);

  const handleRowClick = (contact: ContactWithCompany) => {
    setSelectedContact(contact);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedContact(null);
  };

  const handleContactAdded = () => {
    loadContacts();
  };

  const handleStageChange = (value: string) => {
    setActiveStage(value as StageType);
    setSearch('');
  };

  const handleAssignClick = (contact: ContactWithCompany) => {
    setContactToAssign(contact);
    setAssignModalOpen(true);
  };

  const handleAssignSuccess = () => {
    loadContacts();
  };

  const handleStageUpdate = () => {
    loadContacts();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your contact records by stage
          </p>
        </div>
        <AddContactModal onSuccess={handleContactAdded} />
      </div>

      {/* Temporary Debug Info */}
      {debugInfo && (
        <div className="rounded-md border border-amber-500 bg-amber-50 p-3 text-xs font-mono dark:bg-amber-950 dark:border-amber-700">
          <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">🔍 Debug Info (temporary):</p>
          <ul className="space-y-0.5 text-amber-700 dark:text-amber-400">
            <li>currentCrmUserId: <span className="font-bold">{debugInfo.currentCrmUserId || 'null'}</span></li>
            <li>selectedStage: <span className="font-bold">{debugInfo.selectedStage}</span></li>
            <li>assignmentRows: <span className="font-bold">{debugInfo.assignmentRows}</span></li>
            <li>contactRows: <span className="font-bold">{debugInfo.contactRows}</span></li>
          </ul>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeStage} onValueChange={handleStageChange}>
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
            <ContactsTable
              contacts={contacts}
              companyNamesMap={companyNamesMap}
              assignmentsMap={assignmentsMap}
              ownersMap={ownersMap}
              ownerNamesMap={ownerNamesMap}
              nextFollowupMap={nextFollowupMap}
              isLoading={isLoading}
              onRowClick={handleRowClick}
              onAssignClick={handleAssignClick}
              onStageChange={handleStageUpdate}
            />
          </TabsContent>
        ))}
      </Tabs>

      <ContactDetailsDrawer
        contact={selectedContact}
        companyName={selectedContact?.company_id ? companyNamesMap[selectedContact.company_id] || null : null}
        currentStage={selectedContact ? assignmentsMap[selectedContact.id]?.stage || null : null}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        onOwnersChange={loadContacts}
      />

      {contactToAssign && (
        <AssignContactModal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          contactId={contactToAssign.id}
          contactName={contactToAssign.full_name || 'Unknown'}
          currentAssignment={assignmentsMap[contactToAssign.id] || null}
          onSuccess={handleAssignSuccess}
        />
      )}
    </div>
  );
}
