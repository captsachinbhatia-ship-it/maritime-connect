import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Loader2, UserPlus, RefreshCw, Users } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { listCrmUsersForAssignment, CrmUserForAssignment } from '@/services/profiles';
import { upsertOwners } from '@/services/assignments';
import { ContactsSearch } from './ContactsSearch';

interface UnassignedContact {
  id: string;
  full_name: string | null;
  company_name: string | null;
  designation: string | null;
  email: string | null;
  primary_phone: string | null;
  primary_phone_type: string | null;
  created_at: string | null;
  created_by_crm_user_id: string | null;
}

const NONE_VALUE = '__none__';

export function UnassignedContactsTab() {
  const [contacts, setContacts] = useState<UnassignedContact[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUserForAssignment[]>([]);
  const [crmUsersMap, setCrmUsersMap] = useState<Record<string, CrmUserForAssignment>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [primarySelections, setPrimarySelections] = useState<Record<string, string>>({});
  const [secondarySelections, setSecondarySelections] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get all contact IDs that have an ACTIVE PRIMARY assignment with a non-null assigned_to_crm_user_id
      // A contact is considered "assigned" only if it has an ACTIVE PRIMARY owner
      const { data: activePrimaryAssignments, error: assignmentsError } = await supabase
        .from('contact_assignments')
        .select('contact_id')
        .eq('status', 'ACTIVE')
        .eq('assignment_role', 'PRIMARY')
        .not('assigned_to_crm_user_id', 'is', null);

      if (assignmentsError) {
        console.error('[UnassignedContactsTab] Error fetching active PRIMARY assignments:', assignmentsError);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Only contacts with ACTIVE PRIMARY are considered assigned
      const assignedContactIds = new Set((activePrimaryAssignments || []).map(a => a.contact_id));
      console.log('[UnassignedContactsTab] Contacts with ACTIVE PRIMARY:', assignedContactIds.size);

      // Get all active contacts from the view
      const { data: allContacts, error: contactsError } = await supabase
        .from('contacts_with_primary_phone')
        .select(`
          id,
          full_name,
          designation,
          email,
          primary_phone,
          primary_phone_type,
          company_id,
          companies ( company_name ),
          created_at,
          created_by_crm_user_id
        `)
        .eq('is_active', true)
        .order('full_name')
        .limit(500);

      if (contactsError) {
        console.error('[UnassignedContactsTab] Error fetching contacts:', contactsError);
        setContacts([]);
      } else {
        // Filter unassigned contacts
        const unassignedContacts = (allContacts || []).filter(
          (c: any) => !assignedContactIds.has(c.id)
        );

        const mappedContacts: UnassignedContact[] = unassignedContacts.map((c: any) => ({
          id: c.id,
          full_name: c.full_name,
          company_name: c.companies?.company_name || null,
          designation: c.designation,
          email: c.email,
          primary_phone: c.primary_phone || null,
          primary_phone_type: c.primary_phone_type || null,
          created_at: c.created_at,
          created_by_crm_user_id: c.created_by_crm_user_id,
        }));

        setContacts(mappedContacts);
      }

      // Fetch CRM users for assignment dropdown
      const { data: crmUsersData, error: crmError } = await listCrmUsersForAssignment();
      if (!crmError && crmUsersData) {
        setCrmUsers(crmUsersData);
        // Build a map for quick lookups
        const usersMap: Record<string, CrmUserForAssignment> = {};
        crmUsersData.forEach(u => { usersMap[u.id] = u; });
        setCrmUsersMap(usersMap);
      }
    } catch (error) {
      console.error('[UnassignedContactsTab] Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const searchLower = search.toLowerCase().trim();
    return contacts.filter(contact => {
      const fullName = (contact.full_name || '').toLowerCase();
      const companyName = (contact.company_name || '').toLowerCase();
      const email = (contact.email || '').toLowerCase();
      const phone = (contact.primary_phone || '').toLowerCase();
      return fullName.includes(searchLower) || 
             companyName.includes(searchLower) || 
             email.includes(searchLower) || 
             phone.includes(searchLower);
    });
  }, [contacts, search]);

  const formatCreatedDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy, HH:mm');
    } catch {
      return '-';
    }
  };

  const handleSave = async (contactId: string) => {
    const primaryId = primarySelections[contactId];
    const secondaryId = secondarySelections[contactId];

    if (!primaryId) {
      toast({
        title: 'Primary Owner Required',
        description: 'Please select a Primary Owner.',
        variant: 'destructive',
      });
      return;
    }

    if (secondaryId && secondaryId !== NONE_VALUE && primaryId === secondaryId) {
      toast({
        title: 'Invalid Selection',
        description: 'Primary and Secondary owner cannot be the same.',
        variant: 'destructive',
      });
      return;
    }

    setSavingId(contactId);

    const result = await upsertOwners({
      contact_id: contactId,
      primary_owner_id: primaryId,
      secondary_owner_id: secondaryId && secondaryId !== NONE_VALUE ? secondaryId : null,
      stage: 'COLD_CALLING', // New assignments start at Cold Calling
    });

    if (result.error) {
      toast({
        title: 'Assignment Failed',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Assigned Successfully',
        description: 'The contact has been assigned.',
      });

      // Clear selections
      setPrimarySelections(prev => {
        const updated = { ...prev };
        delete updated[contactId];
        return updated;
      });
      setSecondarySelections(prev => {
        const updated = { ...prev };
        delete updated[contactId];
        return updated;
      });

      // Refresh list
      await fetchData();
    }

    setSavingId(null);
  };

  const formatUserLabel = (user: CrmUserForAssignment): string => {
    if (user.email) {
      return `${user.full_name} (${user.email})`;
    }
    return user.full_name;
  };

  const formatAddedBy = (creatorId: string | null): string => {
    if (!creatorId) return 'Unknown';
    const user = crmUsersMap[creatorId];
    if (!user) return 'Unknown';
    return user.email ? `${user.full_name} (${user.email})` : user.full_name;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Users className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Unassigned Contacts</CardTitle>
              <CardDescription>
                {isLoading ? 'Loading...' : `${filteredContacts.length} contacts need assignment`}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <ContactsSearch value={search} onChange={setSearch} />
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <UserPlus className="mb-2 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">All contacts are assigned</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
              <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[200px]">Primary Owner *</TableHead>
                  <TableHead className="w-[200px]">Secondary Owner</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const primaryId = primarySelections[contact.id] || '';
                  const secondaryId = secondarySelections[contact.id] || NONE_VALUE;

                  return (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.full_name || '—'}
                      </TableCell>
                      <TableCell>
                        {contact.company_name ? (
                          <Badge variant="secondary">{contact.company_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatAddedBy(contact.created_by_crm_user_id)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatCreatedDate(contact.created_at)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={primaryId}
                          onValueChange={(value) =>
                            setPrimarySelections(prev => ({ ...prev, [contact.id]: value }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select primary..." />
                          </SelectTrigger>
                          <SelectContent>
                            {crmUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {formatUserLabel(user)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={secondaryId}
                          onValueChange={(value) =>
                            setSecondarySelections(prev => ({ ...prev, [contact.id]: value }))
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select secondary..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_VALUE}>None</SelectItem>
                            {crmUsers.map((user) => (
                              <SelectItem
                                key={user.id}
                                value={user.id}
                                disabled={user.id === primaryId}
                              >
                                {formatUserLabel(user)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSave(contact.id)}
                          disabled={savingId === contact.id || !primaryId}
                        >
                          {savingId === contact.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
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
  );
}
