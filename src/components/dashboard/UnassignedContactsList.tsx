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
import { supabase } from '@/lib/supabaseClient';
import { DirectoryRow } from '@/types/directory';

interface UnassignedContact {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
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
      // Use unified view to find unassigned contacts
      const { data, error } = await supabase
        .from('v_directory_contacts')
        .select('id, full_name, company_name, email, is_unassigned')
        .eq('is_unassigned', true)
        .order('full_name')
        .limit(500);

      if (error) {
        console.error('[UnassignedContactsList] Error:', error);
        setContacts([]);
      } else {
        const mapped: UnassignedContact[] = (data || []).map((c: any) => ({
          id: c.id,
          full_name: c.full_name,
          company_name: c.company_name || null,
          email: c.email,
        }));
        setContacts(mapped);
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
      const result = await upsertAssignment({
        contact_id: contactId,
        assigned_to_crm_user_id: selectedCrmUserId,
        stage: 'COLD_CALLING',
      });

      if (result.error) {
        toast({ title: 'Assignment failed', description: result.error, variant: 'destructive' });
        return;
      }

      toast({ title: 'Assigned successfully', description: 'The contact has been assigned.' });

      setSelectedUsers(prev => {
        const updated = { ...prev };
        delete updated[contactId];
        return updated;
      });
      
      await fetchData();
    } catch (error) {
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
                              {user.full_name}
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
