import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, UserPlus, RefreshCw, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listProfilesForAssignment, Profile } from '@/services/profiles';

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
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch unassigned contacts from view
      const { data: contactsData, error: contactsError } = await supabase
        .from('v_unassigned_contacts')
        .select('*')
        .limit(50);

      if (contactsError) {
        console.error('Error fetching unassigned contacts:', contactsError);
      } else {
        setContacts(contactsData || []);
      }

      // Fetch users for assignment dropdown
      const { data: usersData } = await listProfilesForAssignment();
      setUsers(usersData || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (contactId: string) => {
    const userId = selectedUsers[contactId];
    if (!userId) {
      toast({
        title: 'Select a user',
        description: 'Please select a user to assign this contact to.',
        variant: 'destructive',
      });
      return;
    }

    setAssigningId(contactId);
    try {
      // Get current user for assigned_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Insert new assignment with ACTIVE status
      const { error } = await supabase
        .from('contact_assignments')
        .insert({
          contact_id: contactId,
          assigned_to: userId,
          assigned_by: user.id,
          stage: 'ASPIRATION',
          status: 'ACTIVE',
        });

      if (error) {
        throw error;
      }

      toast({
        title: 'Contact assigned',
        description: 'The contact has been assigned successfully.',
      });

      // Remove from local list
      setContacts(prev => prev.filter(c => c.id !== contactId));
      setSelectedUsers(prev => {
        const updated = { ...prev };
        delete updated[contactId];
        return updated;
      });
    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        title: 'Assignment failed',
        description: error instanceof Error ? error.message : 'Failed to assign contact.',
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
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name || 'Unknown User'}
                              {user.role && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({user.role})
                                </span>
                              )}
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
