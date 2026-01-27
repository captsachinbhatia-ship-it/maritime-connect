import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { AssignContactModal } from '@/components/contacts/AssignContactModal';
import { ContactsSearch } from '@/components/contacts/ContactsSearch';
import { getCompanyNamesMap } from '@/services/contacts';
import { getCurrentUserProfile, Profile } from '@/services/profiles';
import { getAssignmentsForContacts, ContactAssignment, AssignmentStage } from '@/services/assignments';
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
  const { user } = useAuth();
  const [activeStage, setActiveStage] = useState<StageType>('ASPIRATION');
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [allContacts, setAllContacts] = useState<ContactWithCompany[]>([]);
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [assignmentsMap, setAssignmentsMap] = useState<Record<string, ContactAssignment>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Admin toggle state
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [viewAllContacts, setViewAllContacts] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // Drawer state
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [contactToAssign, setContactToAssign] = useState<ContactWithCompany | null>(null);

  const isAdmin = currentUserProfile?.role === 'ADMIN';

  // Load current user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      const result = await getCurrentUserProfile();
      if (result.data) {
        setCurrentUserProfile(result.data);
      }
      setIsLoadingProfile(false);
    };
    loadProfile();
  }, []);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get assignments first (filtered by stage and optionally by user)
      let assignmentQuery = supabase
        .from('contact_assignments')
        .select('*')
        .eq('status', 'ACTIVE');
      
      // If not admin or not viewing all, filter by current user
      if (!isAdmin || !viewAllContacts) {
        if (user?.id) {
          assignmentQuery = assignmentQuery.eq('assigned_to', user.id);
        }
      }

      const { data: assignments, error: assignmentError } = await assignmentQuery;

      if (assignmentError) {
        setError(assignmentError.message);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Build assignments map
      const assignmentsById: Record<string, ContactAssignment> = {};
      assignments?.forEach(a => {
        assignmentsById[a.contact_id] = a as ContactAssignment;
      });
      setAssignmentsMap(assignmentsById);

      // Get contact IDs for current stage
      const stageAssignments = assignments?.filter(a => a.stage === activeStage) || [];
      const contactIds = stageAssignments.map(a => a.contact_id);

      if (contactIds.length === 0) {
        setContacts([]);
        setAllContacts([]);
        setIsLoading(false);
        return;
      }

      // Step 2: Fetch contacts with those IDs
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
        setError(contactsError.message);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      const contactsList = (contactsData || []) as ContactWithCompany[];
      setContacts(contactsList);
      setAllContacts(contactsList);

      // Step 3: Fetch company names
      const companyIds = contactsList
        .map(c => c.company_id)
        .filter((id): id is string => id !== null);

      if (companyIds.length > 0) {
        const namesResult = await getCompanyNamesMap(companyIds);
        if (namesResult.data) {
          setCompanyNamesMap(namesResult.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [activeStage, search, isAdmin, viewAllContacts, user?.id]);

  useEffect(() => {
    if (!isLoadingProfile) {
      loadContacts();
    }
  }, [loadContacts, isLoadingProfile]);

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

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your contact records by stage
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
              <Label htmlFor="view-toggle" className="text-sm font-medium">
                {viewAllContacts ? 'All Contacts' : 'My Contacts'}
              </Label>
              <Switch
                id="view-toggle"
                checked={viewAllContacts}
                onCheckedChange={setViewAllContacts}
              />
            </div>
          )}
          <AddContactModal onSuccess={handleContactAdded} />
        </div>
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
              isLoading={isLoading}
              onRowClick={handleRowClick}
              onAssignClick={handleAssignClick}
              onStageChange={handleStageUpdate}
              showAssignColumn={isAdmin && viewAllContacts}
            />
          </TabsContent>
        ))}
      </Tabs>

      <ContactDetailsDrawer
        contact={selectedContact}
        companyName={selectedContact?.company_id ? companyNamesMap[selectedContact.company_id] || null : null}
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
