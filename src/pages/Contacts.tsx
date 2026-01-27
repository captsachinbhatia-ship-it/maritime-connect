import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { ContactsSearch } from '@/components/contacts/ContactsSearch';
import { listContactsByStage, getCompanyNamesMap, StageType } from '@/services/contacts';
import { ContactWithCompany } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const STAGES: { value: StageType; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
];

export default function Contacts() {
  const [activeStage, setActiveStage] = useState<StageType>('ASPIRATION');
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Drawer state
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listContactsByStage(activeStage, { search });

      if (result.error) {
        setError(result.error);
        setContacts([]);
        return;
      }

      const contactsList = result.data || [];
      setContacts(contactsList);

      // Fetch company names for all contacts
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
  }, [activeStage, search]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

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
              isLoading={isLoading}
              onRowClick={handleRowClick}
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
    </div>
  );
}
