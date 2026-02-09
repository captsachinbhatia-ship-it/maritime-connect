import { useState, useEffect, useCallback, useMemo } from 'react';
import { Filter } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { ContactDetailsDrawer } from './ContactDetailsDrawer';
import { ContactsSearch } from './ContactsSearch';
import { ContactWithCompany } from '@/types';

function formatDaysSince(createdAt: string | null): string {
  if (!createdAt) return '—';
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffHours < 1) return `${diffMins} min`;
  if (diffDays < 1) return `${diffHours} hr`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
}

interface MyAddedContact {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  primary_phone: string | null;
  created_at: string | null;
  days_since_added: number | null;
  is_active: boolean | null;
}

interface SecondaryOwnerInfo {
  full_name: string | null;
  email: string | null;
}

interface MyAddedContactsTabProps {
  onRefresh?: () => void;
}

export function MyAddedContactsTab({ onRefresh }: MyAddedContactsTabProps) {
  const { session, loading: authLoading } = useAuth();
  const [contacts, setContacts] = useState<MyAddedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [secondaryOwnersMap, setSecondaryOwnersMap] = useState<Record<string, SecondaryOwnerInfo[]>>({});

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
        const mapped = (data || []).map((c: any) => ({
          id: c.id || c.contact_id,
          full_name: c.full_name,
          company_name: c.company_name,
          email: c.email,
          primary_phone: c.primary_phone || c.phone,
          created_at: c.created_at,
          days_since_added: c.days_since_added ?? c.days_unassigned ?? null,
          is_active: c.is_active ?? true,
        }));
        setContacts(mapped);

        // Batch-fetch secondary owners
        const contactIds = mapped.map((c: MyAddedContact) => c.id);
        if (contactIds.length > 0) {
          const { data: secData } = await supabase
            .from('contact_assignments')
            .select('contact_id, crm_users:assigned_to_crm_user_id(full_name,email)')
            .eq('assignment_role', 'SECONDARY')
            .is('ended_at', null)
            .in('contact_id', contactIds);

          const map: Record<string, SecondaryOwnerInfo[]> = {};
          (secData || []).forEach((row: any) => {
            const cid = row.contact_id;
            if (!map[cid]) map[cid] = [];
            const user = row.crm_users;
            if (user) {
              map[cid].push({ full_name: user.full_name, email: user.email });
            }
          });
          setSecondaryOwnersMap(map);
        }
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

  const handleRowClick = (e: React.MouseEvent, contact: MyAddedContact) => {
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
      is_active: contact.is_active ?? true,
      updated_at: null,
      created_at: contact.created_at,
      company_name: contact.company_name || undefined,
    });
    setDrawerOpen(true);
  };

  const renderSecondaryOwners = (contactId: string) => {
    const owners = secondaryOwnersMap[contactId];
    if (!owners || owners.length === 0) {
      return <span className="text-muted-foreground/50">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {owners.map((o, i) => (
          <Badge key={i} variant="outline" className="text-xs">
            {o.full_name || o.email || 'Unknown'}
          </Badge>
        ))}
      </div>
    );
  };

  const filteredContacts = useMemo(() => {
    let result = contacts;

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter(c => c.is_active !== false);
    } else if (statusFilter === 'inactive') {
      result = result.filter(c => c.is_active === false);
    }

    if (!search.trim()) return result;
    const q = search.toLowerCase().trim();
    return result.filter(
      (c) =>
        (c.full_name || '').toLowerCase().includes(q) ||
        (c.company_name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.primary_phone || '').toLowerCase().includes(q)
    );
  }, [contacts, search, statusFilter]);

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
                <TableHead>Secondary Owner</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
          Showing {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} you added
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
              <SelectTrigger className="h-8 w-[120px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ContactsSearch value={search} onChange={setSearch} />
        </div>
      </div>

      {filteredContacts.length === 0 ? (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">
            {search.trim()
              ? 'No contacts match your search.'
              : "You haven't added any contacts yet."}
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
                <TableHead>Secondary Owner</TableHead>
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
                    <Badge variant="outline" className="text-xs">
                      {formatDaysSince(contact.created_at)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {renderSecondaryOwners(contact.id)}
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
