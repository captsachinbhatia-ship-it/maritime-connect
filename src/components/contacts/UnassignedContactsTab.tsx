import { useEffect, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, UserPlus, RefreshCw, Users, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { adminAssignContacts, adminAssignUnassigned } from '@/services/adminAssignments';
import { ContactsSearch } from './ContactsSearch';
import { ContactDetailsDrawer } from './ContactDetailsDrawer';
import { AssignContactModal } from './AssignContactModal';
import { ContactWithCompany } from '@/types';

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
  created_by_name: string | null;
  created_by_email: string | null;
}

export function UnassignedContactsTab() {
  const [contacts, setContacts] = useState<UnassignedContact[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUserForAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  // Bulk assignment state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetUserId, setTargetUserId] = useState('');
  const [assignNextN, setAssignNextN] = useState(50);

  // Drawer state
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Assign primary modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalContact, setAssignModalContact] = useState<UnassignedContact | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Use the v_unassigned_contacts view which handles NOT EXISTS logic server-side
      const { data: viewData, error } = await supabase
        .from('v_unassigned_contacts')
        .select('*')
        .limit(200);

      if (error) {
        console.error('[UnassignedContactsTab] Error fetching from view:', error);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      const mapped: UnassignedContact[] = (viewData || []).map((c: any) => ({
        id: c.id || c.contact_id,
        full_name: c.full_name,
        company_name: c.company_name,
        designation: c.designation,
        email: c.email,
        primary_phone: c.primary_phone || c.phone,
        primary_phone_type: c.primary_phone_type || c.phone_type,
        created_at: c.created_at,
        created_by_crm_user_id: c.created_by_crm_user_id,
        created_by_name: c.created_by_name,
        created_by_email: c.created_by_email,
      }));

      setContacts(mapped);
      setSelectedIds(new Set());

      // Fetch CRM users for assignment dropdown
      const { data: crmUsersData } = await listCrmUsersForAssignment();
      if (crmUsersData) {
        setCrmUsers(crmUsersData);
      }
    } catch (error) {
      console.error('[UnassignedContactsTab] Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const searchLower = search.toLowerCase().trim();
    return contacts.filter(contact => {
      return (contact.full_name || '').toLowerCase().includes(searchLower) ||
             (contact.company_name || '').toLowerCase().includes(searchLower) ||
             (contact.email || '').toLowerCase().includes(searchLower) ||
             (contact.primary_phone || '').toLowerCase().includes(searchLower);
    });
  }, [contacts, search]);

  const formatCreatedDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return '-';
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleAssignSelected = async () => {
    if (!targetUserId) {
      toast({ title: 'Select a user', description: 'Please select a user to assign contacts to.', variant: 'destructive' });
      return;
    }
    if (selectedIds.size === 0) {
      toast({ title: 'No contacts selected', description: 'Please select at least one contact.', variant: 'destructive' });
      return;
    }

    setIsAssigning(true);
    const { data, error } = await adminAssignContacts(targetUserId, Array.from(selectedIds));
    setIsAssigning(false);

    if (error) {
      toast({ title: 'Assignment failed', description: error, variant: 'destructive' });
    } else {
      const count = data?.assigned_count ?? selectedIds.size;
      toast({ title: 'Assigned successfully', description: `Assigned ${count} contacts.` });
      await fetchData();
    }
  };

  const handleAssignNextN = async () => {
    if (!targetUserId) {
      toast({ title: 'Select a user', description: 'Please select a user to assign contacts to.', variant: 'destructive' });
      return;
    }
    if (assignNextN < 1) {
      toast({ title: 'Invalid count', description: 'Please enter a valid number.', variant: 'destructive' });
      return;
    }

    setIsAssigning(true);
    const { data, error } = await adminAssignUnassigned(targetUserId, assignNextN);
    setIsAssigning(false);

    if (error) {
      toast({ title: 'Assignment failed', description: error, variant: 'destructive' });
    } else {
      const count = data?.assigned_count ?? assignNextN;
      toast({ title: 'Assigned successfully', description: `Assigned ${count} contacts.` });
      await fetchData();
    }
  };

  const handleRowClick = (e: React.MouseEvent, contact: UnassignedContact) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="checkbox"]') || target.closest('input')) {
      return;
    }
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

  const formatUserLabel = (user: CrmUserForAssignment): string => {
    return user.full_name;
  };

  const formatCreatedBy = (contact: UnassignedContact): string => {
    return contact.created_by_name || 'Unknown';
  };

  return (
    <>
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
          {/* Bulk assignment controls */}
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3 bg-muted/30">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Assign to user</label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select user..." />
                </SelectTrigger>
                <SelectContent>
                  {crmUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {formatUserLabel(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button
                size="sm"
                onClick={handleAssignSelected}
                disabled={isAssigning || selectedIds.size === 0 || !targetUserId}
              >
                {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                Assign Selected ({selectedIds.size})
              </Button>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Next N</label>
                <Input
                  type="number"
                  value={assignNextN}
                  onChange={(e) => setAssignNextN(parseInt(e.target.value) || 0)}
                  className="h-9 w-20"
                  min={1}
                  max={500}
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAssignNextN}
                disabled={isAssigning || !targetUserId || assignNextN < 1}
              >
                {isAssigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Assign Next {assignNextN}
              </Button>
            </div>
          </div>

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
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={filteredContacts.length > 0 && selectedIds.size === filteredContacts.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Created</TableHead>
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
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(contact.id)}
                          onCheckedChange={() => toggleSelect(contact.id)}
                          aria-label={`Select ${contact.full_name}`}
                        />
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
                      <TableCell className="text-sm text-muted-foreground">
                        {formatCreatedBy(contact)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatCreatedDate(contact.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssignModalContact(contact);
                            setAssignModalOpen(true);
                          }}
                        >
                          <UserPlus className="mr-1 h-4 w-4" />
                          Assign
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

      {assignModalContact && (
        <AssignContactModal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          contactId={assignModalContact.id}
          contactName={assignModalContact.full_name || 'Unknown'}
          onSuccess={() => {
            fetchData();
            setAssignModalContact(null);
          }}
        />
      )}
    </>
  );
}
