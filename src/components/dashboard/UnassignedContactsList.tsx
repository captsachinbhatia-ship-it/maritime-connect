import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, RefreshCw, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listCrmUsersForAssignment, CrmUserForAssignment } from '@/services/profiles';
import { upsertAssignment } from '@/services/assignments';

interface UnassignedContact {
  id: string;
  full_name: string | null;
  company_name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
}

export function UnassignedContactsList() {
  const [contacts, setContacts] = useState<UnassignedContact[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUserForAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      
      // Step 1: Get all contact IDs that have an ACTIVE assignment with a non-null assigned_to_crm_user_id
      const { data: activeAssignments, error: assignmentsError } = await supabase
        .from('contact_assignments')
        .select('contact_id')
        .eq('status', 'ACTIVE')
        .not('assigned_to_crm_user_id', 'is', null);

      if (assignmentsError) {
        console.error('[UnassignedContactsList] Error fetching active assignments:', assignmentsError);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Extract assigned contact IDs
      const assignedContactIds = (activeAssignments || []).map(a => a.contact_id);
      console.log('[UnassignedContactsList] Found', assignedContactIds.length, 'contacts with ACTIVE assignments');

      // Step 2: Get all contacts, then filter out assigned ones
      let query = supabase
        .from('contacts')
        .select(`
          id,
          full_name,
          designation,
          email,
          phone,
          company_id,
          companies ( company_name )
        `)
        .eq('is_active', true)
        .order('full_name')
        .limit(100);

      // If there are assigned contacts, exclude them
      if (assignedContactIds.length > 0) {
        query = query.not('id', 'in', `(${assignedContactIds.join(',')})`);
      }

      const { data: contactsData, error: contactsError } = await query;

      if (contactsError) {
        console.error('[UnassignedContactsList] Error fetching contacts:', contactsError);
        setContacts([]);
      } else {
        // Map to expected format
        const mappedContacts: UnassignedContact[] = (contactsData || []).map((c: any) => ({
          id: c.id,
          full_name: c.full_name,
          company_name: c.companies?.company_name || null,
          designation: c.designation,
          email: c.email,
          phone: c.phone,
        }));
        console.log('[UnassignedContactsList] Found', mappedContacts.length, 'unassigned contacts');
        setContacts(mappedContacts);
      }

      // Fetch CRM users for assignment dropdown
      const { data: crmUsersData, error: crmError } = await listCrmUsersForAssignment();
      if (crmError) {
        console.error('[UnassignedContactsList] Error fetching CRM users:', crmError);
      } else {
        setCrmUsers(crmUsersData || []);
      }
    } catch (error) {
      console.error('[UnassignedContactsList] Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (contactId: string) => {
    const selectedCrmUserId = selectedUsers[contactId];
    if (!selectedCrmUserId) {
      toast({
        title: 'Select a user',
        description: 'Please select a user to assign this contact to.',
        variant: 'destructive',
      });
      return;
    }

    setAssigningId(contactId);
    try {
      // Use upsertAssignment which handles CRM user resolution internally
      const result = await upsertAssignment({
        contact_id: contactId,
        assigned_to_crm_user_id: selectedCrmUserId,
        stage: 'COLD_CALLING',
      });

      if (result.error) {
        console.error('[UnassignedContactsList] Assignment error:', result.error);
        toast({
          title: 'Assignment failed',
          description: result.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Assigned successfully',
        description: 'The contact has been assigned.',
      });

      // Clear selection and refresh list from server
      setSelectedUsers(prev => {
        const updated = { ...prev };
        delete updated[contactId];
        return updated;
      });
      
      // Refresh the full list to ensure data integrity
      await fetchData();
    } catch (error) {
      console.error('[UnassignedContactsList] Unexpected error:', error);
      toast({
        title: 'Assignment failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setAssigningId(null);
    }
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
                {isLoading ? 'Loading...' : `${contacts.length} contacts need assignment`}
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
                  <TableHead>Designation</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[200px]">Assign To</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
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
                    <TableCell className="text-muted-foreground">
                      {contact.designation || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {contact.email || '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={selectedUsers[contact.id] || ''}
                        onValueChange={(value) => 
                          setSelectedUsers(prev => ({ ...prev, [contact.id]: value }))
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select user..." />
                        </SelectTrigger>
                        <SelectContent>
                          {crmUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name}{user.email ? ` (${user.email})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleAssign(contact.id)}
                        disabled={assigningId === contact.id || !selectedUsers[contact.id]}
                      >
                        {assigningId === contact.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Assign'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
