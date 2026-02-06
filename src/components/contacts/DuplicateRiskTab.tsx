import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabaseClient';
import { ContactDetailsDrawer } from './ContactDetailsDrawer';
import { ContactsSearch } from './ContactsSearch';
import { ContactWithCompany } from '@/types';

interface DuplicateRiskContact {
  id: string;
  full_name: string | null;
  company_name: string | null;
  designation: string | null;
  email: string | null;
  primary_phone: string | null;
  primary_phone_type: string | null;
  created_at: string | null;
  duplicate_count: number;
}

export function DuplicateRiskTab() {
  const [contacts, setContacts] = useState<DuplicateRiskContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_duplicate_risk')
        .select('*')
        .order('duplicate_count', { ascending: false })
        .order('full_name', { ascending: true });

      if (error) {
        console.error('[DuplicateRiskTab] Error:', error);
        setContacts([]);
      } else {
        setContacts((data || []) as DuplicateRiskContact[]);
      }
    } catch (err) {
      console.error('[DuplicateRiskTab] Failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const s = search.toLowerCase().trim();
    return contacts.filter(c => {
      return (c.full_name || '').toLowerCase().includes(s) ||
             (c.company_name || '').toLowerCase().includes(s) ||
             (c.email || '').toLowerCase().includes(s) ||
             (c.primary_phone || '').toLowerCase().includes(s);
    });
  }, [contacts, search]);

  const handleRowClick = (contact: DuplicateRiskContact) => {
    setSelectedContact({
      id: contact.id,
      full_name: contact.full_name,
      company_id: null,
      designation: contact.designation,
      country_code: null,
      phone: null,
      phone_type: null,
      primary_phone: contact.primary_phone,
      primary_phone_type: contact.primary_phone_type,
      email: contact.email,
      ice_handle: null,
      preferred_channel: null,
      notes: null,
      is_active: true,
      updated_at: null,
      created_at: contact.created_at,
      company_name: contact.company_name || undefined,
    });
    setDrawerOpen(true);
  };

  const getDuplicateCountColor = (count: number) => {
    if (count >= 5) return 'bg-destructive text-destructive-foreground';
    if (count >= 3) return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg">Duplicate Risk</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading...' : `${filteredContacts.length} contacts with potential duplicates`}
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
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {search.trim() ? 'No contacts match your search.' : 'No duplicate risks found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Duplicates</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(contact)}
                    >
                      <TableCell>
                        <Badge className={`text-sm font-bold ${getDuplicateCountColor(contact.duplicate_count)}`}>
                          {contact.duplicate_count}
                        </Badge>
                      </TableCell>
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
                        {contact.designation || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contact.email || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {contact.primary_phone || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ContactDetailsDrawer
        contact={selectedContact}
        companyName={selectedContact?.company_name || null}
        currentStage={null}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedContact(null);
        }}
        onOwnersChange={fetchData}
        onCompanyChange={() => fetchData()}
      />
    </>
  );
}
