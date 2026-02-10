import { useEffect, useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Loader2, RefreshCw, BookOpen, Filter, AlertTriangle } from 'lucide-react';
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
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: SortDirection }>({ column: 'full_name', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
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

    // Sort: unassigned first, then by sort config
    filtered = [...filtered].sort((a, b) => {
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
  }, [contacts, nameFilter, companyFilter, ownerFilter, stageFilter, sortConfig, companyNamesMap, ownersMap]);

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

  // Inline Primary/Secondary change — uses lowercase 'primary'/'secondary' for DB
  const handleOwnerChange = async (
    contactId: string,
    role: 'primary' | 'secondary',
    newUserId: string,
  ) => {
    const cellKey = `${contactId}-${role}`;
    const prevOwners = ownersMap[contactId];
    setSavingCells(prev => ({ ...prev, [cellKey]: true }));

    const contact = contacts.find(c => c.id === contactId);
    const currentStage = (contact?.stage as AssignmentStage) || 'COLD_CALLING';

    // addAssignment accepts AssignmentRole which is uppercase — cast for DB compatibility
    const { error } = await addAssignment({
      contact_id: contactId,
      assigned_to_crm_user_id: newUserId,
      assignment_role: role as any,
      stage: currentStage,
    });

    setSavingCells(prev => ({ ...prev, [cellKey]: false }));

    if (error) {
      toast({ title: 'Save failed', description: error, variant: 'destructive' });
      setOwnersMap(prev => ({ ...prev, [contactId]: prevOwners || { primary: null, secondary: null } }));
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

  // Inline Stage change
  const handleStageChange = async (contactId: string, newStage: string) => {
    const cellKey = `${contactId}-stage`;
    const prevContact = contacts.find(c => c.id === contactId);
    setSavingCells(prev => ({ ...prev, [cellKey]: true }));

    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage: newStage } : c));

    const { error: contactUpdateError } = await supabase
      .from('contacts')
      .update({ stage: newStage })
      .eq('id', contactId);

    if (contactUpdateError) {
      toast({ title: 'Stage update failed', description: contactUpdateError.message, variant: 'destructive' });
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, stage: prevContact?.stage || null } : c));
      setSavingCells(prev => ({ ...prev, [cellKey]: false }));
      return;
    }

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

  // Check if any cell in a row is saving
  const isRowSaving = (contactId: string) =>
    !!savingCells[`${contactId}-primary`] || !!savingCells[`${contactId}-secondary`] || !!savingCells[`${contactId}-stage`];

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
          <div className="flex items-center gap-1.5 ml-auto">
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
                    <TableHead>Primary Owner</TableHead>
                    <TableHead>Secondary Owner</TableHead>
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
                    const isSelected = selectedIds.includes(contact.id);
                    const hasPrimary = !!primaryOwnerId;
                    const rowSaving = isRowSaving(contact.id);

                    return (
                      <TableRow
                        key={contact.id}
                        className={[
                          'border-gray-200 hover:bg-gray-50',
                          isSelected ? 'bg-primary/5' : '',
                          !hasPrimary ? 'bg-red-50 border-red-200' : '',
                          rowSaving ? 'opacity-50 pointer-events-none' : '',
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

                        {/* Primary Owner */}
                        <TableCell className="text-sm">
                          {isAdmin ? (
                            <Select
                              value={primaryOwnerId || '_unassigned'}
                              onValueChange={(val) => {
                                if (val !== '_unassigned') handleOwnerChange(contact.id, 'primary', val);
                              }}
                              disabled={!!savingCells[`${contact.id}-primary`]}
                            >
                              <SelectTrigger className="h-7 w-[150px] text-xs border-gray-300 focus:ring-blue-500">
                                <SelectValue>
                                  {primaryOwnerId ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 text-xs font-medium">
                                      {ownerNamesMap[primaryOwnerId] || 'Unknown'}
                                    </Badge>
                                  ) : (
                                    <span className="text-red-500 font-medium">Unassigned</span>
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
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 font-medium">
                              {ownerNamesMap[primaryOwnerId] || 'Unknown'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-500 border-red-200 border-dashed font-normal">
                              Unassigned
                            </Badge>
                          )}
                        </TableCell>

                        {/* Secondary Owner — DISABLED if no primary */}
                        <TableCell className="text-sm">
                          {isAdmin ? (
                            hasPrimary ? (
                              <Select
                                value={secondaryOwnerId || '_none'}
                                onValueChange={(val) => {
                                  if (val === '_none') return;
                                  if (val === primaryOwnerId) return; // safety
                                  handleOwnerChange(contact.id, 'secondary', val);
                                }}
                                disabled={!!savingCells[`${contact.id}-secondary`]}
                              >
                                <SelectTrigger className="h-7 w-[150px] text-xs border-gray-300 focus:ring-blue-500">
                                  <SelectValue>
                                    {secondaryOwnerId ? (
                                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0 text-xs font-medium">
                                        {ownerNamesMap[secondaryOwnerId] || 'Unknown'}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">None</span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none">None</SelectItem>
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
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-not-allowed">
                                    <Badge variant="outline" className="border-dashed text-muted-foreground text-xs font-normal opacity-50">
                                      —
                                    </Badge>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Assign primary owner first</p>
                                </TooltipContent>
                              </Tooltip>
                            )
                          ) : secondaryOwnerId ? (
                            <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0 font-medium">
                              {ownerNamesMap[secondaryOwnerId] || 'Unknown'}
                            </Badge>
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
  );
}
