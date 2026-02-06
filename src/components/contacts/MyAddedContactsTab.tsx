import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentCrmUserId } from '@/services/profiles';
import { assignPrimaryContactOwner } from '@/services/assignPrimary';
import { ContactDetailsDrawer } from './ContactDetailsDrawer';
import { ContactsSearch } from './ContactsSearch';
import { ContactWithCompany } from '@/types';
import { toast } from '@/hooks/use-toast';

interface MyAddedUnassigned {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  primary_phone: string | null;
  created_at: string | null;
  days_since_added: number | null;
}

interface MyAddedContactsTabProps {
  onRefresh?: () => void;
}

export function MyAddedContactsTab({ onRefresh }: MyAddedContactsTabProps) {
  const { session, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<MyAddedUnassigned[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Drawer state
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!session) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('v_my_added_unassigned')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setContacts([]);
      } else {
        setContacts(
          (data || []).map((c: any) => ({
            id: c.id || c.contact_id,
            full_name: c.full_name,
            company_name: c.company_name,
            email: c.email,
            primary_phone: c.primary_phone || c.phone,
            created_at: c.created_at,
            days_since_added: c.days_since_added ?? c.days_unassigned ?? null,
          }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!authLoading) {
      loadContacts();
    }
  }, [loadContacts, authLoading]);

  const handleAssignToMe = async (contact: MyAddedUnassigned) => {
    setAssigningId(contact.id);

    try {
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();

      if (crmError || !currentCrmUserId) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: crmError || 'Could not determine your CRM user ID',
        });
        return;
      }

      const { error: assignError } = await assignPrimaryContactOwner({
        contactId: contact.id,
        assigneeCrmUserId: currentCrmUserId,
        stage: 'COLD_CALLING',
      });

      if (assignError) {
        toast({
          variant: 'destructive',
          title: 'Assignment Failed',
          description: assignError,
        });
      } else {
        toast({
          title: 'Assigned to You',
          description: `${contact.full_name || 'Contact'} is now in your Cold Calling pipeline`,
        });
        loadContacts();
        onRefresh?.();
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Assignment Failed',
        description: err.message,
      });
    } finally {
      setAssigningId(null);
    }
  };

  const handleRowClick = (e: React.MouseEvent, contact: MyAddedUnassigned) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    setSelectedContact({
      id: contact.id,
      full_name: contact.full_name,
      company_id: null,
      designation: null,
      country_code: null,
      phone: null,
      phone_type: null,
      primary_phone: contact.primary_phone,
      primary_phone_type: null,
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

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase().trim();
    return contacts.filter(
      (c) =>
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.company_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.primary_phone || '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <ContactsSearch value={search} onChange={setSearch} />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Days Since Added</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredContacts.length} unassigned contact{filteredContacts.length !== 1 ? 's' : ''} you added
        </p>
        <ContactsSearch value={search} onChange={setSearch} />
      </div>

      {filteredContacts.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">
            {search.trim()
              ? 'No contacts match your search.'
              : "You haven't added any unassigned contacts yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Days Since Added</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer"
                  onClick={(e) => handleRowClick(e, contact)}
                >
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
                    {contact.primary_phone || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {contact.email || '—'}
                  </TableCell>
                  <TableCell>
                    {contact.days_since_added != null ? (
                      <Badge variant="outline" className="text-xs">
                        {contact.days_since_added} day{contact.days_since_added !== 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={assigningId === contact.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignToMe(contact);
                      }}
                    >
                      {assigningId === contact.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="mr-1 h-4 w-4" />
                      )}
                      Assign to Me
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ContactDetailsDrawer
        contact={selectedContact}
        companyName={selectedContact?.company_name || null}
        currentStage={null}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedContact(null);
        }}
        onOwnersChange={loadContacts}
        onCompanyChange={() => loadContacts()}
      />
    </div>
  );
}
