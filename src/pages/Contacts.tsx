import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { AssignContactModal } from '@/components/contacts/AssignContactModal';
import { ContactsSearch } from '@/components/contacts/ContactsSearch';
import { getCompanyNamesMap } from '@/services/contacts';
import { ContactAssignment } from '@/services/assignments';
import { getNextFollowupDueMap } from '@/services/followups';
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
  const [nextFollowupMap, setNextFollowupMap] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
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
      // Step 1: Fetch contacts directly - RLS enforces visibility
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
        .order('full_name', { ascending: true });

      // Apply search filter
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

      let contactsList = (contactsData || []) as ContactWithCompany[];

      if (contactsList.length === 0) {
        setContacts([]);
        setAssignmentsMap({});
        setIsLoading(false);
        return;
      }

      const allContactIds = contactsList.map(c => c.id);

      // Step 2: Fetch active assignments for these contacts - RLS enforces visibility
      const { data: allAssignments, error: assignmentError } = await supabase
        .from('contact_assignments')
        .select('*')
        .eq('status', 'ACTIVE')
        .in('contact_id', allContactIds)
        .order('assigned_at', { ascending: false });

      if (assignmentError) {
        console.error('Assignment fetch error:', assignmentError.message);
      }

      // Build assignments map (contact_id -> assignment with stage)
      const assignmentsById: Record<string, ContactAssignment> = {};
      (allAssignments || []).forEach(a => {
        // Only keep the latest assignment per contact
        if (!assignmentsById[a.contact_id]) {
          assignmentsById[a.contact_id] = a as ContactAssignment;
        }
      });
      setAssignmentsMap(assignmentsById);

      // Step 3: Filter contacts by active stage tab
      const filteredContacts = contactsList.filter(c => {
        const assignment = assignmentsById[c.id];
        return assignment?.stage === activeStage;
      });

      // Step 4: Fetch last interaction data from view
      if (filteredContacts.length > 0) {
        const contactIdsForInteraction = filteredContacts.map(c => c.id);
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
          contactsList = filteredContacts.map(c => ({
            ...c,
            ...liMap[c.id],
          }));
        } else {
          contactsList = filteredContacts;
        }
      } else {
        contactsList = filteredContacts;
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
    } catch (err) {
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
