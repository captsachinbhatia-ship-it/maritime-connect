import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { ContactWithCompany } from '@/types';
import { AlertTriangle, UserCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MyWorkTodayProps {
  onContactClick: (contact: ContactWithCompany) => void;
}

export function MyWorkToday({ onContactClick }: MyWorkTodayProps) {
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStaleContacts = async () => {
      setIsLoading(true);
      try {
        const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
        if (crmError || !currentCrmUserId) {
          setContacts([]);
          setIsLoading(false);
          return;
        }

        const { data: assignments } = await supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('status', 'ACTIVE')
          .eq('assigned_to_crm_user_id', currentCrmUserId)
          .in('assignment_role', ['PRIMARY', 'SECONDARY']);

        const contactIds = [...new Set(assignments?.map(a => a.contact_id) || [])];

        if (contactIds.length === 0) {
          setContacts([]);
          setIsLoading(false);
          return;
        }

        const { data: lastInteractions } = await supabase
          .from('v_contacts_last_interaction')
          .select('contact_id, last_interaction_at, last_interaction_type')
          .in('contact_id', contactIds);

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const interactionMap = new Map(
          lastInteractions?.map(li => [li.contact_id, li]) || []
        );

        const staleContactIds = contactIds.filter(id => {
          const li = interactionMap.get(id);
          if (!li?.last_interaction_at) return true;
          return new Date(li.last_interaction_at) < fourteenDaysAgo;
        });

        if (staleContactIds.length === 0) {
          setContacts([]);
          setIsLoading(false);
          return;
        }

        const { data: contactsData } = await supabase
          .from('contacts')
          .select('id, full_name, company_id, designation, email, phone')
          .in('id', staleContactIds);

        let contactsList = (contactsData || []).map(c => ({
          ...c,
          last_interaction_at: interactionMap.get(c.id)?.last_interaction_at || null,
          last_interaction_type: interactionMap.get(c.id)?.last_interaction_type || null,
        })) as ContactWithCompany[];

        contactsList.sort((a, b) => {
          if (!a.last_interaction_at && !b.last_interaction_at) return 0;
          if (!a.last_interaction_at) return -1;
          if (!b.last_interaction_at) return 1;
          return new Date(a.last_interaction_at).getTime() - new Date(b.last_interaction_at).getTime();
        });

        contactsList = contactsList.slice(0, 10);
        setContacts(contactsList);

        const companyIds = contactsList
          .map(c => c.company_id)
          .filter((id): id is string => id !== null);

        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', companyIds);

          const map: Record<string, string> = {};
          companies?.forEach(c => {
            if (c.company_name) map[c.id] = c.company_name;
          });
          setCompanyMap(map);
        }
      } catch (error) {
        console.error('Failed to fetch stale contacts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaleContacts();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
            <AlertTriangle className="h-4.5 w-4.5 text-orange-600" />
          </div>
          <CardTitle className="text-base">Stale Contacts</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <UserCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground">No stale contacts requiring attention</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Contact</TableHead>
                    <TableHead className="text-xs">Company</TableHead>
                    <TableHead className="text-xs text-right">Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onContactClick(contact)}
                    >
                      <TableCell className="py-2">
                        <p className="text-sm font-medium leading-tight">{contact.full_name || '—'}</p>
                        {contact.designation && (
                          <p className="text-[11px] text-muted-foreground leading-tight">{contact.designation}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground py-2">
                        {contact.company_id ? companyMap[contact.company_id] || '—' : '—'}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        {contact.last_interaction_at ? (
                          <Badge variant="outline" className="text-[11px] font-normal text-orange-600">
                            {formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true })}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] font-normal text-destructive">
                            Never
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Click a row to open contact details
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
