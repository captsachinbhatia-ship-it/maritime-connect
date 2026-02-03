import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, AlertOctagon, UserCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NeglectedContact {
  id: string;
  fullName: string;
  companyName: string | null;
  assignedTo: string;
  lastInteractionAt: string | null;
}

export function RiskNeglectList() {
  const [contacts, setContacts] = useState<NeglectedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNeglectedContacts = async () => {
      setIsLoading(true);

      try {
        // Get all active assignments
        const { data: assignments } = await supabase
          .from('contact_assignments')
          .select('contact_id, assigned_to_crm_user_id')
          .eq('status', 'ACTIVE');

        if (!assignments || assignments.length === 0) {
          setContacts([]);
          setIsLoading(false);
          return;
        }

        // Deduplicate by contact_id
        const contactAssignmentMap = new Map<string, string>();
        assignments.forEach(a => {
          if (!contactAssignmentMap.has(a.contact_id) && a.assigned_to_crm_user_id) {
            contactAssignmentMap.set(a.contact_id, a.assigned_to_crm_user_id);
          }
        });

        const contactIds = [...contactAssignmentMap.keys()];

        // Get last interaction data
        const { data: lastInteractions } = await supabase
          .from('v_contacts_last_interaction')
          .select('contact_id, last_interaction_at')
          .in('contact_id', contactIds);

        const interactionMap = new Map(
          lastInteractions?.map(li => [li.contact_id, li.last_interaction_at]) || []
        );

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Filter contacts with no activity in 30+ days
        const neglectedIds = contactIds.filter(id => {
          const lastAt = interactionMap.get(id);
          if (!lastAt) return true;
          return new Date(lastAt) < thirtyDaysAgo;
        });

        if (neglectedIds.length === 0) {
          setContacts([]);
          setIsLoading(false);
          return;
        }

        // Fetch contact details
        const { data: contactsData } = await supabase
          .from('contacts')
          .select('id, full_name, company_id')
          .in('id', neglectedIds.slice(0, 10)); // Limit to 10

        // Fetch company names
        const companyIds = contactsData
          ?.map(c => c.company_id)
          .filter((id): id is string => id !== null) || [];

        let companyMap: Record<string, string> = {};
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', companyIds);

          companyMap = Object.fromEntries(
            companies?.map(c => [c.id, c.company_name || '']) || []
          );
        }

        // Fetch assignee names from crm_users
        const assigneeIds = [...new Set(neglectedIds.map(id => contactAssignmentMap.get(id)!))].filter(Boolean);
        const { data: crmUsers } = await supabase
          .from('crm_users')
          .select('id, full_name, email')
          .in('id', assigneeIds);

        const crmUserMap = new Map(
          crmUsers?.map(u => [u.id, u.full_name || u.email || 'Unknown']) || []
        );

        // Build result
        let result: NeglectedContact[] = (contactsData || []).map(c => ({
          id: c.id,
          fullName: c.full_name || 'Unknown',
          companyName: c.company_id ? companyMap[c.company_id] || null : null,
          assignedTo: crmUserMap.get(contactAssignmentMap.get(c.id)!) || 'Unassigned',
          lastInteractionAt: interactionMap.get(c.id) || null,
        }));

        // Sort by oldest first
        result.sort((a, b) => {
          if (!a.lastInteractionAt && !b.lastInteractionAt) return 0;
          if (!a.lastInteractionAt) return -1;
          if (!b.lastInteractionAt) return 1;
          return new Date(a.lastInteractionAt).getTime() - new Date(b.lastInteractionAt).getTime();
        });

        setContacts(result);
      } catch (error) {
        console.error('Failed to fetch neglected contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNeglectedContacts();
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <AlertOctagon className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-lg">Risk & Neglect</CardTitle>
            <CardDescription>Contacts untouched for 30+ days</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-3 font-medium text-foreground">No neglected contacts</p>
            <p className="text-sm text-muted-foreground">All contacts have recent activity</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{contact.fullName}</p>
                      {contact.companyName && (
                        <p className="text-xs text-muted-foreground">{contact.companyName}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {contact.assignedTo}
                  </TableCell>
                  <TableCell className="text-right">
                    {contact.lastInteractionAt ? (
                      <Badge variant="outline" className="font-normal text-destructive">
                        {formatDistanceToNow(new Date(contact.lastInteractionAt), { addSuffix: true })}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal text-destructive">
                        Never
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
