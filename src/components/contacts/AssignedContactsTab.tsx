import { useEffect, useState, useCallback, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Loader2, RefreshCw, Users, PhoneCall, Mail, Video, MessageSquare, FileEdit, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ContactOwners, getOwnersForContacts } from '@/services/assignments';
import { getUserNames } from '@/services/interactions';
import { getCompanyNamesMap } from '@/services/contacts';
import { AssignOwnersModal } from './AssignOwnersModal';
import { ColumnFiltersBar, SortableHeader, type ColumnFilters, type SortColumn, type SortDirection } from './ColumnFilters';
import { ContactWithCompany } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const INTERACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-3 w-3" />,
  WHATSAPP: <MessageSquare className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  MEETING: <Video className="h-3 w-3" />,
  NOTE: <FileEdit className="h-3 w-3" />,
};

const STAGE_LABELS: Record<string, string> = {
  COLD_CALLING: 'Cold Calling',
  ASPIRATION: 'Aspiration',
  ACHIEVEMENT: 'Achievement',
  INACTIVE: 'Inactive',
};

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800',
  ASPIRATION: 'bg-amber-100 text-amber-800',
  ACHIEVEMENT: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

interface AssignedContact extends ContactWithCompany {
  stage: string | null;
  created_at?: string | null;
  created_by_crm_user_id?: string | null;
}

export function AssignedContactsTab() {
  const { isAdmin } = useAuth();
  const [contacts, setContacts] = useState<AssignedContact[]>([]);
  const [ownersMap, setOwnersMap] = useState<Record<string, ContactOwners>>({});
  const [ownerNamesMap, setOwnerNamesMap] = useState<Record<string, string>>({});
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({ fullName: '', company: '', designation: '', email: '' });
  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: SortDirection }>({ column: 'full_name', direction: 'asc' });
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  // Modal state
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<AssignedContact | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all contacts with ACTIVE assignments
      const { data: activeAssignments, error: assignmentsError } = await supabase
        .from('contact_assignments')
        .select('contact_id, stage, assigned_to_crm_user_id')
        .eq('status', 'ACTIVE')
        .eq('assignment_role', 'PRIMARY')
        .not('assigned_to_crm_user_id', 'is', null);

      if (assignmentsError) {
        console.error('[AssignedContactsTab] Error fetching assignments:', assignmentsError);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      const assignmentsByContact: Record<string, { stage: string }> = {};
      (activeAssignments || []).forEach(a => {
        assignmentsByContact[a.contact_id] = { stage: a.stage };
      });

      const contactIds = Object.keys(assignmentsByContact);

      if (contactIds.length === 0) {
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Fetch contacts from the view (fetch all, filter client-side by status)
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts_with_primary_phone')
        .select('*')
        .in('id', contactIds)
        .order('full_name', { ascending: true });

      if (contactsError) {
        console.error('[AssignedContactsTab] Error fetching contacts:', contactsError);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      // Fetch last interaction data
      let contactsList = (contactsData || []).map((c: any) => ({
        ...c,
        stage: assignmentsByContact[c.id]?.stage || null,
      })) as AssignedContact[];

      if (contactsList.length > 0) {
        const contactIdsForInteraction = contactsList.map(c => c.id);
        const { data: lastInteractionData } = await supabase
          .from('v_contacts_last_interaction')
          .select('*')
          .in('contact_id', contactIdsForInteraction);

        if (lastInteractionData && lastInteractionData.length > 0) {
          const liMap: Record<string, Partial<ContactWithCompany>> = {};
          lastInteractionData.forEach((li: any) => {
            liMap[li.contact_id] = {
              last_interaction_at: li.last_interaction_at,
              last_interaction_type: li.last_interaction_type,
              last_interaction_outcome: li.last_interaction_outcome,
              last_interaction_subject: li.last_interaction_subject || null,
              last_interaction_notes: li.last_interaction_notes || null,
            };
          });
          contactsList = contactsList.map(c => ({
            ...c,
            ...liMap[c.id],
          }));
        }
      }

      setContacts(contactsList);

      // Fetch company names
      const companyIds = contactsList
        .map(c => c.company_id)
        .filter((id): id is string => id !== null);

      if (companyIds.length > 0) {
        const namesResult = await getCompanyNamesMap(companyIds);
        if (namesResult.data) {
          setCompanyNamesMap(namesResult.data);
        }
      }

      // Fetch owners
      if (contactIds.length > 0) {
        const ownersResult = await getOwnersForContacts(contactIds);
        if (ownersResult.data) {
          setOwnersMap(ownersResult.data);

          // Collect owner user IDs for name resolution
          const ownerUserIds = new Set<string>();
          Object.values(ownersResult.data).forEach(owners => {
            if (owners.primary?.assigned_to_crm_user_id) {
              ownerUserIds.add(owners.primary.assigned_to_crm_user_id);
            }
            if (owners.secondary?.assigned_to_crm_user_id) {
              ownerUserIds.add(owners.secondary.assigned_to_crm_user_id);
            }
          });

          if (ownerUserIds.size > 0) {
            const ownerNamesResult = await getUserNames(Array.from(ownerUserIds));
            if (ownerNamesResult.data) {
              setOwnerNamesMap(ownerNamesResult.data);
            }
          }
        }
      }

      // Also resolve creator names
      const creatorIds = contactsList
        .map(c => c.created_by_crm_user_id)
        .filter((id): id is string => id !== null);

      if (creatorIds.length > 0) {
        const creatorNamesResult = await getUserNames(creatorIds);
        if (creatorNamesResult.data) {
          setOwnerNamesMap(prev => ({ ...prev, ...creatorNamesResult.data }));
        }
      }
    } catch (error) {
      console.error('[AssignedContactsTab] Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReassignClick = (contact: AssignedContact, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedContact(contact);
    setReassignModalOpen(true);
  };

  const handleReassignSuccess = () => {
    fetchData();
  };

  const formatLastInteraction = (contact: AssignedContact) => {
    if (!contact.last_interaction_at) return null;

    const type = contact.last_interaction_type || '';
    const timeAgo = formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true });
    const outcome = contact.last_interaction_outcome;

    return { type, timeAgo, outcome };
  };

  // Column filter + sort logic
  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(c => c.is_active !== false);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(c => c.is_active === false);
    }

    if (columnFilters.fullName.trim()) {
      const s = columnFilters.fullName.toLowerCase().trim();
      filtered = filtered.filter(c => (c.full_name || '').toLowerCase().includes(s));
    }
    if (columnFilters.company.trim()) {
      const s = columnFilters.company.toLowerCase().trim();
      filtered = filtered.filter(c => {
        const name = c.company_id ? (companyNamesMap[c.company_id] || '') : '';
        return name.toLowerCase().includes(s);
      });
    }
    if (columnFilters.designation.trim()) {
      const s = columnFilters.designation.toLowerCase().trim();
      filtered = filtered.filter(c => (c.designation || '').toLowerCase().includes(s));
    }
    if (columnFilters.email.trim()) {
      const s = columnFilters.email.toLowerCase().trim();
      filtered = filtered.filter(c => (c.email || '').toLowerCase().includes(s));
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      let aVal = '';
      let bVal = '';

      switch (sortConfig.column) {
        case 'full_name':
          aVal = (a.full_name || '').toLowerCase();
          bVal = (b.full_name || '').toLowerCase();
          break;
        case 'company':
          aVal = (a.company_id ? companyNamesMap[a.company_id] || '' : '').toLowerCase();
          bVal = (b.company_id ? companyNamesMap[b.company_id] || '' : '').toLowerCase();
          break;
        case 'designation':
          aVal = (a.designation || '').toLowerCase();
          bVal = (b.designation || '').toLowerCase();
          break;
        case 'email':
          aVal = (a.email || '').toLowerCase();
          bVal = (b.email || '').toLowerCase();
          break;
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
        case 'stage':
          aVal = (a.stage || '').toLowerCase();
          bVal = (b.stage || '').toLowerCase();
          break;
      }

      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });

    return filtered;
  }, [contacts, columnFilters, sortConfig, companyNamesMap, statusFilter]);

  const handleSort = (column: SortColumn) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const hasActiveFilters = Object.values(columnFilters).some(v => v.trim() !== '');

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
                <CardTitle className="text-lg">All Contacts</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading...' : `${filteredContacts.length} contacts`}
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
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1">
              <ColumnFiltersBar filters={columnFilters} onFiltersChange={setColumnFilters} />
            </div>
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
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? 'No contacts match your filters.' : 'No contacts found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortableHeader label="Name" column="full_name" currentSort={sortConfig} onSort={handleSort} />
                    </TableHead>
                    <TableHead>
                      <SortableHeader label="Company" column="company" currentSort={sortConfig} onSort={handleSort} />
                    </TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>
                      <SortableHeader label="Email" column="email" currentSort={sortConfig} onSort={handleSort} />
                    </TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Primary Owner</TableHead>
                    <TableHead>Secondary Owner</TableHead>
                    <TableHead>
                      <SortableHeader label="Created" column="created_at" currentSort={sortConfig} onSort={handleSort} />
                    </TableHead>
                    <TableHead>
                      <SortableHeader label="Stage" column="stage" currentSort={sortConfig} onSort={handleSort} />
                    </TableHead>
                    {isAdmin && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => {
                    const owners = ownersMap[contact.id];
                    const primaryOwnerId = owners?.primary?.assigned_to_crm_user_id;
                    const secondaryOwnerId = owners?.secondary?.assigned_to_crm_user_id;
                    const creatorId = contact.created_by_crm_user_id;

                    const formatCreatedDate = (dateStr: string | null | undefined) => {
                      if (!dateStr) return '—';
                      try {
                        return format(new Date(dateStr), 'dd MMM yyyy, HH:mm');
                      } catch {
                        return '—';
                      }
                    };

                    return (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.full_name || '—'}
                        </TableCell>
                        <TableCell>
                          {contact.company_id ? (
                            <Badge variant="secondary">
                              {companyNamesMap[contact.company_id] || '—'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.primary_phone || contact.phone ? (
                            <span className="text-xs text-muted-foreground max-w-[120px] truncate block" title={contact.primary_phone || contact.phone || ''}>
                              {contact.primary_phone || contact.phone}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.email ? (
                            <span className="text-xs text-muted-foreground max-w-[160px] truncate block" title={contact.email}>
                              {contact.email}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {creatorId
                            ? ownerNamesMap[creatorId] || 'Unknown'
                            : <span className="text-muted-foreground/50">Unknown</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {primaryOwnerId
                            ? ownerNamesMap[primaryOwnerId] || 'Unknown'
                            : <span className="text-muted-foreground">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {secondaryOwnerId
                            ? ownerNamesMap[secondaryOwnerId] || 'Unknown'
                            : <span className="text-muted-foreground/50">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatCreatedDate(contact.created_at)}
                        </TableCell>
                        <TableCell>
                          {contact.stage ? (
                            <Badge className={STAGE_COLORS[contact.stage] || ''}>
                              {STAGE_LABELS[contact.stage] || contact.stage}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleReassignClick(contact, e)}
                            >
                              <Users className="mr-1 h-4 w-4" />
                              Reassign
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedContact && (
        <AssignOwnersModal
          open={reassignModalOpen}
          onOpenChange={setReassignModalOpen}
          contactId={selectedContact.id}
          contactName={selectedContact.full_name || 'Unknown'}
          currentOwners={ownersMap[selectedContact.id] || null}
          onSuccess={handleReassignSuccess}
        />
      )}
    </>
  );
}
