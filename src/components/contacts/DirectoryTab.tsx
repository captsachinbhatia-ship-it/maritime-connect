import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { Loader2, RefreshCw, BookOpen, Filter, AlertTriangle, User, Users, Pencil, Trash2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabaseClient';
import { ContactOwners, getOwnersForContacts, type AssignmentStage } from '@/services/assignments';
import { getUserNames } from '@/services/interactions';
import { getCompanyNamesMap } from '@/services/contacts';
import { getActiveCrmUsers } from '@/services/assignPrimary';
import { SortableHeader, type SortColumn, type SortDirection } from './ColumnFilters';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useCrmUser } from '@/hooks/useCrmUser';
import { DirectoryBulkToolbar } from './DirectoryBulkToolbar';
import { DirectorySummaryTable } from './DirectorySummaryTable';
import { ContactEditSheet } from './ContactEditSheet';
import { useToast } from '@/hooks/use-toast';

const STAGE_OPTIONS: { value: AssignmentStage; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

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

interface DirectoryContact {
  id: string;
  full_name: string | null;
  company_id: string | null;
  designation: string | null;
  email?: string | null;
  phone?: string | null;
  ice_handle?: string | null;
  preferred_channel?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string | null;
  created_by_crm_user_id?: string | null;
  stage: string | null;
  country?: string | null;
}

interface DirectoryTabProps {
  onCountsChanged?: () => void;
}

export function DirectoryTab({ onCountsChanged }: DirectoryTabProps = {}) {
  const { isAdmin } = useAuth();
  const { crmUserId } = useCrmUser();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<DirectoryContact[]>([]);
  const [ownersMap, setOwnersMap] = useState<Record<string, ContactOwners>>({});
  const [ownerNamesMap, setOwnerNamesMap] = useState<Record<string, string>>({});
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [crmUsers, setCrmUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: SortDirection }>({ column: 'full_name', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});

  // Editing pin: keep row in position during assignment changes
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const editingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (editingTimerRef.current) clearTimeout(editingTimerRef.current);
    };
  }, []);

  // Stage counts derived from contacts (auto-updates on any change)
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0, INACTIVE: 0 };
    contacts.forEach(c => {
      if (c.stage && counts.hasOwnProperty(c.stage)) {
        counts[c.stage]++;
      }
    });
    return counts;
  }, [contacts]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (contactsError) {
        console.error('[DirectoryTab] Error fetching contacts:', contactsError);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      const contactsList: DirectoryContact[] = (contactsData || []).map((c: any) => ({
        ...c,
        stage: c.stage || null,
      }));

      setContacts(contactsList);

      const contactIds = contactsList.map(c => c.id);
      const companyIds = contactsList
        .map(c => c.company_id)
        .filter((id): id is string => id !== null);

      const [ownersResult, companyResult, usersResult] = await Promise.all([
        contactIds.length > 0 ? getOwnersForContacts(contactIds) : Promise.resolve({ data: {} as Record<string, ContactOwners>, error: null }),
        companyIds.length > 0 ? getCompanyNamesMap(companyIds) : Promise.resolve({ data: {} as Record<string, string>, error: null }),
        getActiveCrmUsers(),
      ]);

      if (companyResult.data) setCompanyNamesMap(companyResult.data);
      if (usersResult.data) setCrmUsers(usersResult.data.map(u => ({ id: u.id, full_name: u.full_name })));

      if (ownersResult.data) {
        setOwnersMap(ownersResult.data);

        const allUserIds = new Set<string>();
        Object.values(ownersResult.data).forEach(owners => {
          if (owners.primary?.assigned_to_crm_user_id) allUserIds.add(owners.primary.assigned_to_crm_user_id);
          if (owners.secondary?.assigned_to_crm_user_id) allUserIds.add(owners.secondary.assigned_to_crm_user_id);
        });
        contactsList.forEach(c => {
          if (c.created_by_crm_user_id) allUserIds.add(c.created_by_crm_user_id);
        });

        if (allUserIds.size > 0) {
          const namesResult = await getUserNames(Array.from(allUserIds));
          if (namesResult.data) setOwnerNamesMap(namesResult.data);
        }
      }
    } catch (error) {
      console.error('[DirectoryTab] Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const contactCountryMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    contacts.forEach(c => { map[c.id] = c.country || null; });
    return map;
  }, [contacts]);

  // Owner counts for dropdown filter
  const ownerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(ownersMap).forEach(owners => {
      const pId = owners.primary?.assigned_to_crm_user_id;
      const sId = owners.secondary?.assigned_to_crm_user_id;
      if (pId) counts[pId] = (counts[pId] || 0) + 1;
      if (sId) counts[sId] = (counts[sId] || 0) + 1;
    });
    return counts;
  }, [ownersMap]);

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    if (nameFilter.trim()) {
      const s = nameFilter.toLowerCase().trim();
      filtered = filtered.filter(c => (c.full_name || '').toLowerCase().includes(s));
    }
    if (companyFilter.trim()) {
      const s = companyFilter.toLowerCase().trim();
      filtered = filtered.filter(c => {
        const name = c.company_id ? (companyNamesMap[c.company_id] || '') : '';
        return name.toLowerCase().includes(s);
      });
    }
    if (ownerFilter !== 'all') {
      filtered = filtered.filter(c => {
        const owners = ownersMap[c.id];
        const pId = owners?.primary?.assigned_to_crm_user_id;
        const sId = owners?.secondary?.assigned_to_crm_user_id;
        return pId === ownerFilter || sId === ownerFilter;
      });
    }
    if (stageFilter !== 'all') {
      filtered = filtered.filter(c => (c.stage || '') === stageFilter);
    }

    // Sort: editing row pinned first, then unassigned, then by sort config
    filtered = [...filtered].sort((a, b) => {
      // Pin editing row at top
      if (a.id === editingContactId) return -1;
      if (b.id === editingContactId) return 1;

      const aHasPrimary = !!ownersMap[a.id]?.primary?.assigned_to_crm_user_id;
      const bHasPrimary = !!ownersMap[b.id]?.primary?.assigned_to_crm_user_id;

      if (!aHasPrimary && bHasPrimary) return -1;
      if (aHasPrimary && !bHasPrimary) return 1;

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
        case 'created_at':
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          break;
        case 'stage':
          aVal = (a.stage || '').toLowerCase();
          bVal = (b.stage || '').toLowerCase();
          break;
        default:
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          return aVal > bVal ? -1 * dir : aVal < bVal ? 1 * dir : 0;
      }

      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });

    return filtered;
  }, [contacts, nameFilter, companyFilter, ownerFilter, stageFilter, sortConfig, companyNamesMap, ownersMap, editingContactId]);

  const handleSort = (column: SortColumn) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const formatCreatedDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return '—';
    }
  };

  // Pin the editing contact row and clear after timeout
  const pinEditingRow = (contactId: string) => {
    if (editingTimerRef.current) clearTimeout(editingTimerRef.current);
    setEditingContactId(contactId);
    editingTimerRef.current = setTimeout(() => {
      setEditingContactId(null);
    }, 3000);
  };

  // Inline Primary/Secondary change — uses reassign RPC for already-assigned contacts
  const handleOwnerChange = async (
    contactId: string,
    role: 'primary' | 'secondary',
    newUserId: string,
  ) => {
    if (!crmUserId) return;

    const cellKey = `${contactId}-${role}`;
    const prevOwners = ownersMap[contactId];
    const currentOwnerId = role === 'primary'
      ? prevOwners?.primary?.assigned_to_crm_user_id
      : prevOwners?.secondary?.assigned_to_crm_user_id;

    // Skip if same owner
    if (currentOwnerId === newUserId) return;

    setSavingCells(prev => ({ ...prev, [cellKey]: true }));
    pinEditingRow(contactId);

    // Validate: secondary requires primary
    if (role === 'secondary') {
      const hasPrimary = !!prevOwners?.primary?.assigned_to_crm_user_id;
      if (!hasPrimary) {
        toast({ title: 'Validation error', description: 'Please assign a Primary owner first.', variant: 'destructive' });
        setSavingCells(prev => ({ ...prev, [cellKey]: false }));
        return;
      }
    }

    // Use reassign RPC for already-assigned contacts, assign RPC for new assignments
    const isReassignment = !!currentOwnerId;

    let rpcError: any = null;
    let rpcResult: any = null;

    if (isReassignment) {
      const { data, error } = await supabase.rpc('reassign_contact_owner', {
        p_contact_id: contactId,
        p_new_owner_id: newUserId,
        p_assignment_role: role.toUpperCase(),
        p_reassigned_by: crmUserId,
      });
      rpcError = error;
      rpcResult = data;
    } else {
      const { data, error } = await supabase.rpc('assign_contact_owner', {
        p_contact_id: contactId,
        p_assigned_to: newUserId,
        p_assignment_role: role.toUpperCase(),
        p_assigned_by: crmUserId,
      });
      rpcError = error;
      rpcResult = data;
    }

    setSavingCells(prev => ({ ...prev, [cellKey]: false }));

    if (rpcError) {
      toast({ title: 'Save failed', description: rpcError.message, variant: 'destructive' });
      setOwnersMap(prev => ({ ...prev, [contactId]: prevOwners || { primary: null, secondary: null } }));
      return;
    }

    if (rpcResult && typeof rpcResult === 'object' && !rpcResult.success) {
      toast({ title: 'Save failed', description: rpcResult.message || rpcResult.error || 'Unknown error', variant: 'destructive' });
      return;
    }

    const userName = crmUsers.find(u => u.id === newUserId)?.full_name || 'Unknown';
    setOwnerNamesMap(prev => ({ ...prev, [newUserId]: userName }));

    // Refetch owners for this contact
    const { data: refreshed } = await getOwnersForContacts([contactId]);
    if (refreshed) {
      setOwnersMap(prev => ({ ...prev, ...refreshed }));
    }
  };

  // Remove secondary owner via RPC
  const handleRemoveSecondary = async (contactId: string) => {
    if (!crmUserId) return;
    const cellKey = `${contactId}-secondary`;
    setSavingCells(prev => ({ ...prev, [cellKey]: true }));

    const { error: rpcError } = await supabase.rpc('remove_secondary_owner', {
      p_contact_id: contactId,
      p_removed_by: crmUserId,
    });

    setSavingCells(prev => ({ ...prev, [cellKey]: false }));

    if (rpcError) {
      toast({ title: 'Remove failed', description: rpcError.message, variant: 'destructive' });
      return;
    }

    // Refetch owners
    const { data: refreshed } = await getOwnersForContacts([contactId]);
    if (refreshed) {
      setOwnersMap(prev => ({ ...prev, ...refreshed }));
    }
  };

  // Inline Stage change via RPC
  const handleStageChange = async (contactId: string, newStage: string) => {
    if (!crmUserId) return;
    const cellKey = `${contactId}-stage`;
    const prevContact = contacts.find(c => c.id === contactId);
    setSavingCells(prev => ({ ...prev, [cellKey]: true }));

    // Optimistic update
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage: newStage } : c));

    const { data: rpcResult, error: rpcError } = await supabase.rpc('update_contact_stage', {
      p_contact_id: contactId,
      p_stage: newStage,
      p_updated_by: crmUserId,
    });

    if (rpcError) {
      toast({ title: 'Stage update failed', description: rpcError.message, variant: 'destructive' });
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage: prevContact?.stage || null } : c));
    } else if (rpcResult && typeof rpcResult === 'object' && !rpcResult.success) {
      toast({ title: 'Stage update failed', description: rpcResult.message || 'Unknown error', variant: 'destructive' });
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage: prevContact?.stage || null } : c));
    }

    setSavingCells(prev => ({ ...prev, [cellKey]: false }));
    onCountsChanged?.();
  };

  // Selection helpers
  const visibleIds = filteredContacts.map(c => c.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(visibleIds);
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkComplete = () => {
    setSelectedIds([]);
    fetchData();
  };

  // Check if any cell in a row is saving
  const isRowSaving = (contactId: string) =>
    !!savingCells[`${contactId}-primary`] || !!savingCells[`${contactId}-secondary`] || !!savingCells[`${contactId}-stage`];

   // --- Admin Edit/Delete ---
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);

  const openEditPanel = (contact: DirectoryContact) => {
    setEditContactId(contact.id);
    setEditSheetOpen(true);
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    const confirmed = window.confirm(
      `⚠️ Delete "${contactName}"?\n\nThis will archive the contact and end all assignments.\n\nContinue?`
    );
    if (!confirmed) return;

    const { error: contactError } = await supabase
      .from('contacts')
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq('id', contactId);

    if (contactError) {
      toast({ title: 'Delete failed', description: contactError.message, variant: 'destructive' });
      return;
    }

    // Close all active assignments
    await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED', ended_at: new Date().toISOString() })
      .eq('contact_id', contactId)
      .eq('status', 'ACTIVE');

    toast({ title: 'Contact deleted', description: `"${contactName}" has been archived.` });
    await fetchData();
    onCountsChanged?.();
  };

  const handleEditSuccess = () => {
    fetchData();
    onCountsChanged?.();
  };

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <BookOpen className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Directory</CardTitle>
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
        {/* Admin-only assignment summary table */}
        {isAdmin && !isLoading && (
          <DirectorySummaryTable
            ownersMap={ownersMap}
            ownerNamesMap={ownerNamesMap}
            contacts={contacts}
          />
        )}

        {/* Bulk toolbar (admin only, when selected) */}
        {isAdmin && selectedIds.length > 0 && (
          <DirectoryBulkToolbar
            selectedIds={selectedIds}
            onClearSelection={() => setSelectedIds([])}
            onComplete={handleBulkComplete}
          />
        )}

        {/* Header filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Input
            placeholder="Contact name…"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="h-8 w-[160px] text-sm"
          />
          <Input
            placeholder="Company…"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-8 w-[150px] text-sm"
          />
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={ownerFilter} onValueChange={setOwnerFilter}>
              <SelectTrigger className="h-8 w-[180px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {crmUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name} ({ownerCounts[u.id] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Stage filter buttons with counts */}
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <Button
              variant={stageFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStageFilter('all')}
            >
              All Stages
            </Button>
            {STAGE_OPTIONS.map(s => (
              <Button
                key={s.value}
                variant={stageFilter === s.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStageFilter(s.value)}
              >
                {s.label} ({stageCounts[s.value] || 0})
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookOpen className="mb-2 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">No contacts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    {isAdmin && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    <TableHead>
                      <SortableHeader label="Contact Name" column="full_name" currentSort={sortConfig} onSort={handleSort} />
                    </TableHead>
                    <TableHead>
                      <SortableHeader label="Company" column="company" currentSort={sortConfig} onSort={handleSort} />
                    </TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        Primary Owner
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Secondary Owner
                      </span>
                    </TableHead>
                    <TableHead>
                      <SortableHeader label="Stage" column="stage" currentSort={sortConfig} onSort={handleSort} />
                    </TableHead>
                    <TableHead>
                      <SortableHeader label="Created" column="created_at" currentSort={sortConfig} onSort={handleSort} />
                    </TableHead>
                    {isAdmin && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => {
                    const owners = ownersMap[contact.id];
                    const primaryOwnerId = owners?.primary?.assigned_to_crm_user_id || '';
                    const secondaryOwnerId = owners?.secondary?.assigned_to_crm_user_id || '';
                    const isSelected = selectedIds.includes(contact.id);
                    const hasPrimary = !!primaryOwnerId;
                    const rowSaving = isRowSaving(contact.id);
                    const isEditing = contact.id === editingContactId;

                    return (
                      <TableRow
                        key={contact.id}
                        className={[
                          'border-gray-200 hover:bg-gray-50',
                          isSelected ? 'bg-primary/5' : '',
                          !hasPrimary ? 'bg-red-50 border-red-200' : '',
                          rowSaving ? 'opacity-50 pointer-events-none' : '',
                          isEditing ? 'ring-2 ring-blue-400 bg-blue-50/30' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {isAdmin && (
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleOne(contact.id)}
                              aria-label={`Select ${contact.full_name}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {!hasPrimary && (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            )}
                            {contact.full_name || '—'}
                          </div>
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

                        {/* Added By */}
                        <TableCell className="text-xs text-muted-foreground">
                          {contact.created_by_crm_user_id
                            ? (ownerNamesMap[contact.created_by_crm_user_id] || '—')
                            : '—'}
                        </TableCell>

                        {/* Primary Owner — professional dropdown, no pill badges */}
                        <TableCell className="text-sm">
                          {isAdmin ? (
                            <select
                              value={primaryOwnerId || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) handleOwnerChange(contact.id, 'primary', val);
                              }}
                              disabled={!!savingCells[`${contact.id}-primary`]}
                              className="w-full max-w-[160px] px-2 py-1.5 text-sm border border-input rounded-md bg-background hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">Unassigned</option>
                              {crmUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name}</option>
                              ))}
                            </select>
                          ) : primaryOwnerId ? (
                            <span className="text-sm">{ownerNamesMap[primaryOwnerId] || 'Unknown'}</span>
                          ) : (
                            <span className="text-red-500 text-sm font-medium">Unassigned</span>
                          )}
                        </TableCell>

                        {/* Secondary Owner — disabled if no primary */}
                        <TableCell className="text-sm">
                          {isAdmin ? (
                            hasPrimary ? (
                              <select
                                value={secondaryOwnerId || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' && secondaryOwnerId) {
                                    handleRemoveSecondary(contact.id);
                                    return;
                                  }
                                  if (val && val !== primaryOwnerId) {
                                    handleOwnerChange(contact.id, 'secondary', val);
                                  }
                                }}
                                disabled={!!savingCells[`${contact.id}-secondary`]}
                                className="w-full max-w-[160px] px-2 py-1.5 text-sm border border-input rounded-md bg-muted/30 hover:border-gray-400 focus:border-gray-600 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">None</option>
                                {crmUsers.filter(u => u.id !== primaryOwnerId).map(u => (
                                  <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))}
                              </select>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center text-xs text-muted-foreground cursor-not-allowed opacity-50">
                                    —
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Assign primary owner first</p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          ) : secondaryOwnerId ? (
                            <span className="text-sm">{ownerNamesMap[secondaryOwnerId] || 'Unknown'}</span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </TableCell>

                        {/* Stage */}
                        <TableCell>
                          {isAdmin ? (
                            <Select
                              value={contact.stage || 'COLD_CALLING'}
                              onValueChange={(val) => handleStageChange(contact.id, val)}
                              disabled={!!savingCells[`${contact.id}-stage`]}
                            >
                              <SelectTrigger className="h-7 w-[130px] text-xs border-gray-300 focus:ring-blue-500">
                                <SelectValue>
                                  <Badge className={`${STAGE_COLORS[contact.stage || 'COLD_CALLING']} text-xs`}>
                                    {STAGE_LABELS[contact.stage || 'COLD_CALLING'] || contact.stage}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {STAGE_OPTIONS.map(s => (
                                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : contact.stage ? (
                            <Badge className={STAGE_COLORS[contact.stage] || ''}>
                              {STAGE_LABELS[contact.stage] || contact.stage}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatCreatedDate(contact.created_at)}
                        </TableCell>

                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => openEditPanel(contact)}
                                title="Edit contact"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteContact(contact.id, contact.full_name || 'Unknown')}
                                title="Delete contact"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Edit Contact Sheet (slides from right) */}
    <ContactEditSheet
      contactId={editContactId}
      open={editSheetOpen}
      onOpenChange={setEditSheetOpen}
      onSuccess={handleEditSuccess}
    />
    </>
  );
}
