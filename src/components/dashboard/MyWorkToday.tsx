import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { ContactWithCompany } from '@/types';
import { Loader2, AlertTriangle, UserCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MyWorkTodayProps {
  onContactClick: (contact: ContactWithCompany) => void;
}

export function MyWorkToday({ onContactClick }: MyWorkTodayProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStaleContacts = async () => {
      if (!user?.id) return;

      setIsLoading(true);

      try {
        // First get the current user's CRM ID
        const { data: crmUser } = await supabase
          .from('crm_users')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (!crmUser) {
          setContacts([]);
          setIsLoading(false);
          return;
        }

        // Get contacts assigned to user via CRM ID
        const { data: assignments } = await supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('assigned_to_crm_user_id', crmUser.id)
          .eq('status', 'ACTIVE');

        const contactIds = assignments?.map(a => a.contact_id) || [];

        if (contactIds.length === 0) {
          setContacts([]);
          setIsLoading(false);
          return;
        }

        // Get last interaction data
        const { data: lastInteractions } = await supabase
          .from('v_contacts_last_interaction')
          .select('contact_id, last_interaction_at, last_interaction_type')
          .in('contact_id', contactIds);

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const interactionMap = new Map(
          lastInteractions?.map(li => [li.contact_id, li]) || []
        );

        // Filter stale contacts
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

        // Fetch contact details
        const { data: contactsData } = await supabase
          .from('contacts')
          .select('id, full_name, company_id, designation, email, phone')
          .in('id', staleContactIds);

        // Merge with interaction data and sort by oldest activity first
        let contactsList = (contactsData || []).map(c => ({
          ...c,
          last_interaction_at: interactionMap.get(c.id)?.last_interaction_at || null,
          last_interaction_type: interactionMap.get(c.id)?.last_interaction_type || null,
        })) as ContactWithCompany[];

        // Sort: nulls first (never contacted), then oldest first
        contactsList.sort((a, b) => {
          if (!a.last_interaction_at && !b.last_interaction_at) return 0;
          if (!a.last_interaction_at) return -1;
          if (!b.last_interaction_at) return 1;
          return new Date(a.last_interaction_at).getTime() - new Date(b.last_interaction_at).getTime();
        });

        // Limit to 10
        contactsList = contactsList.slice(0, 10);

        setContacts(contactsList);

        // Fetch company names
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
  }, [user?.id]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-lg">My Work Today</CardTitle>
            <CardDescription>Contacts needing attention (no activity in 14+ days)</CardDescription>
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <UserCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="mt-3 font-medium text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground">No stale contacts requiring attention</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onContactClick(contact)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{contact.full_name || '—'}</p>
                      {contact.designation && (
                        <p className="text-xs text-muted-foreground">{contact.designation}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.company_id ? companyMap[contact.company_id] || '—' : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {contact.last_interaction_at ? (
                      <Badge variant="outline" className="font-normal text-orange-600">
                        {formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true })}
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
