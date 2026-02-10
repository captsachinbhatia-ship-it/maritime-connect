import { useEffect, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Loader2, RefreshCw, BookOpen, Filter } from 'lucide-react';
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
import { supabase } from '@/lib/supabaseClient';
import { ContactOwners, getOwnersForContacts, addAssignment, type AssignmentStage } from '@/services/assignments';
import { getUserNames } from '@/services/interactions';
import { getCompanyNamesMap } from '@/services/contacts';
import { getActiveCrmUsers } from '@/services/assignPrimary';
import { SortableHeader, type SortColumn, type SortDirection } from './ColumnFilters';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { DirectoryBulkToolbar } from './DirectoryBulkToolbar';
import { DirectorySummaryTable } from './DirectorySummaryTable';
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
  is_active: boolean;
  created_at?: string | null;
  created_by_crm_user_id?: string | null;
  stage: string | null;
  country?: string | null;
}

export function DirectoryTab() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<DirectoryContact[]>([]);
  const [ownersMap, setOwnersMap] = useState<Record<string, ContactOwners>>({});
  const [ownerNamesMap, setOwnerNamesMap] = useState<Record<string, string>>({});
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [crmUsers, setCrmUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [addedByFilter, setAddedByFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: SortDirection }>({ column: 'full_name', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Track saving state per contact+field for optimistic revert
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch ALL contacts (not just assigned ones)
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, full_name, company_id, designation, is_active, created_at, created_by_crm_user_id, stage, country')
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

      // Fetch all related data in parallel
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

        // Collect all user IDs that need name resolution
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

  // Contact country map for summary table
  const contactCountryMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    contacts.forEach(c => { map[c.id] = c.country || null; });
    return map;
  }, [contacts]);

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
    if (addedByFilter.trim()) {
      const s = addedByFilter.toLowerCase().trim();
      filtered = filtered.filter(c => {
        const name = c.created_by_crm_user_id ? (ownerNamesMap[c.created_by_crm_user_id] || '') : 'System';
        return name.toLowerCase().includes(s);
      });
    }
    if (stageFilter !== 'all') {
      filtered = filtered.filter(c => (c.stage || '') === stageFilter);
    }

    // Sort: unassigned first (no PRIMARY), then by created_at desc within groups
    filtered = [...filtered].sort((a, b) => {
      const aHasPrimary = !!ownersMap[a.id]?.primary?.assigned_to_crm_user_id;
      const bHasPrimary = !!ownersMap[b.id]?.primary?.assigned_to_crm_user_id;

      // Unassigned contacts first
      if (!aHasPrimary && bHasPrimary) return -1;
      if (aHasPrimary && !bHasPrimary) return 1;

      // Within same group, apply sort config
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
          // Default: newest first
          aVal = a.created_at || '';
          bVal = b.created_at || '';
          return aVal > bVal ? -1 * dir : aVal < bVal ? 1 * dir : 0;
      }

      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });

    return filtered;
  }, [contacts, nameFilter, companyFilter, addedByFilter, stageFilter, sortConfig, companyNamesMap, ownerNamesMap, ownersMap]);

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

  // Inline Primary/Secondary change handler
  const handleOwnerChange = async (
    contactId: string,
    role: 'PRIMARY' | 'SECONDARY',
    newUserId: string,
  ) => {
    const cellKey = `${contactId}-${role}`;
    const prevOwners = ownersMap[contactId];
    setSavingCells(prev => ({ ...prev, [cellKey]: true }));

    // Determine stage: use contact's current stage or default
    const contact = contacts.find(c => c.id === contactId);
    const currentStage = (contact?.stage as AssignmentStage) || 'COLD_CALLING';

    const { error } = await addAssignment({
      contact_id: contactId,
      assigned_to_crm_user_id: newUserId,
      assignment_role: role,
      stage: currentStage,
    });

    setSavingCells(prev => ({ ...prev, [cellKey]: false }));

    if (error) {
      toast({ title: 'Save failed', description: error, variant: 'destructive' });
      // Revert: restore previous owners
      setOwnersMap(prev => ({ ...prev, [contactId]: prevOwners || { primary: null, secondary: null } }));
      return;
    }

    // Optimistically update the local ownersMap
    const userName = crmUsers.find(u => u.id === newUserId)?.full_name || 'Unknown';
    setOwnerNamesMap(prev => ({ ...prev, [newUserId]: userName }));

    // Refetch owners for this contact
    const { data: refreshed } = await getOwnersForContacts([contactId]);
    if (refreshed) {
      setOwnersMap(prev => ({ ...prev, ...refreshed }));
    }
  };

  // Inline Stage change handler
  const handleStageChange = async (contactId: string, newStage: string) => {
    const cellKey = `${contactId}-stage`;
    const prevContact = contacts.find(c => c.id === contactId);
    setSavingCells(prev => ({ ...prev, [cellKey]: true }));

    // Optimistic update
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage: newStage } : c));

    const { error: contactUpdateError } = await supabase
      .from('contacts')
      .update({ stage: newStage })
      .eq('id', contactId);

    if (contactUpdateError) {
      toast({ title: 'Stage update failed', description: contactUpdateError.message, variant: 'destructive' });
      // Revert
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage: prevContact?.stage || null } : c));
      setSavingCells(prev => ({ ...prev, [cellKey]: false }));
      return;
    }

    // Also update active assignments stage
    await supabase
      .from('contact_assignments')
      .update({ stage: newStage })
      .eq('contact_id', contactId)
      .eq('status', 'ACTIVE');

    setSavingCells(prev => ({ ...prev, [cellKey]: false }));
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

  return (
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
            contactCountryMap={contactCountryMap}
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
          <Input
            placeholder="Added by…"
            value={addedByFilter}
            onChange={(e) => setAddedByFilter(e.target.value)}
            className="h-8 w-[140px] text-sm"
          />
          <div className="flex items-center gap-1.5 ml-auto">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="h-8 w-[140px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {STAGE_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
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
            <BookOpen className="mb-2 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">No contacts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableHead>Primary Owner</TableHead>
                  <TableHead>Secondary Owner</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>
                    <SortableHeader label="Stage" column="stage" currentSort={sortConfig} onSort={handleSort} />
                  </TableHead>
                  <TableHead>
                    <SortableHeader label="Created" column="created_at" currentSort={sortConfig} onSort={handleSort} />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => {
                  const owners = ownersMap[contact.id];
                  const primaryOwnerId = owners?.primary?.assigned_to_crm_user_id || '';
                  const secondaryOwnerId = owners?.secondary?.assigned_to_crm_user_id || '';
                  const creatorId = contact.created_by_crm_user_id;
                  const isSelected = selectedIds.includes(contact.id);
                  const hasPrimary = !!primaryOwnerId;

                  return (
                    <TableRow key={contact.id} className={`${isSelected ? 'bg-primary/5' : ''} ${!hasPrimary ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}>
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

                      {/* Primary Owner - inline dropdown for admin, badge for others */}
                      <TableCell className="text-sm">
                        {isAdmin ? (
                          <Select
                            value={primaryOwnerId || '_unassigned'}
                            onValueChange={(val) => {
                              if (val !== '_unassigned') handleOwnerChange(contact.id, 'PRIMARY', val);
                            }}
                            disabled={!!savingCells[`${contact.id}-PRIMARY`]}
                          >
                            <SelectTrigger className="h-7 w-[150px] text-xs">
                              <SelectValue>
                                {primaryOwnerId ? (
                                  <span className="text-emerald-700 font-medium">
                                    {ownerNamesMap[primaryOwnerId] || 'Unknown'}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Unassigned</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_unassigned" disabled>Unassigned</SelectItem>
                              {crmUsers.map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : primaryOwnerId ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 font-medium">
                            {ownerNamesMap[primaryOwnerId] || 'Unknown'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-dashed font-normal">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>

                      {/* Secondary Owner - inline dropdown for admin */}
                      <TableCell className="text-sm">
                        {isAdmin ? (
                          <Select
                            value={secondaryOwnerId || '_unassigned'}
                            onValueChange={(val) => {
                              if (val !== '_unassigned') handleOwnerChange(contact.id, 'SECONDARY', val);
                            }}
                            disabled={!!savingCells[`${contact.id}-SECONDARY`]}
                          >
                            <SelectTrigger className="h-7 w-[150px] text-xs">
                              <SelectValue>
                                {secondaryOwnerId ? (
                                  <span className="text-sky-700 font-medium">
                                    {ownerNamesMap[secondaryOwnerId] || 'Unknown'}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Unassigned</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_unassigned" disabled>Unassigned</SelectItem>
                              {crmUsers.map(u => (
                                <SelectItem
                                  key={u.id}
                                  value={u.id}
                                  disabled={u.id === primaryOwnerId}
                                >
                                  {u.full_name}{u.id === primaryOwnerId ? ' (Primary)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : secondaryOwnerId ? (
                          <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 border-0 font-medium">
                            {ownerNamesMap[secondaryOwnerId] || 'Unknown'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {creatorId
                          ? ownerNamesMap[creatorId] || 'System'
                          : <span className="text-muted-foreground/50">System</span>}
                      </TableCell>

                      {/* Stage - inline dropdown for admin */}
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            value={contact.stage || 'COLD_CALLING'}
                            onValueChange={(val) => handleStageChange(contact.id, val)}
                            disabled={!!savingCells[`${contact.id}-stage`]}
                          >
                            <SelectTrigger className="h-7 w-[130px] text-xs">
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
