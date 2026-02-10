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
import { ContactOwners, getOwnersForContacts } from '@/services/assignments';
import { getUserNames } from '@/services/interactions';
import { getCompanyNamesMap } from '@/services/contacts';
import { SortableHeader, type SortColumn, type SortDirection } from './ColumnFilters';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { DirectoryUserChips, type UserFilter } from './DirectoryUserChips';
import { DirectoryBulkToolbar } from './DirectoryBulkToolbar';

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
}

export function DirectoryTab() {
  const { isAdmin } = useAuth();
  const [contacts, setContacts] = useState<DirectoryContact[]>([]);
  const [ownersMap, setOwnersMap] = useState<Record<string, ContactOwners>>({});
  const [ownerNamesMap, setOwnerNamesMap] = useState<Record<string, string>>({});
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: SortDirection }>({ column: 'full_name', direction: 'asc' });
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [userFilter, setUserFilter] = useState<UserFilter | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: activeAssignments, error: assignmentsError } = await supabase
        .from('contact_assignments')
        .select('contact_id, stage, assigned_to_crm_user_id')
        .eq('status', 'ACTIVE')
        .in('assignment_role', ['PRIMARY', 'primary'])
        .not('assigned_to_crm_user_id', 'is', null);

      if (assignmentsError) {
        console.error('[DirectoryTab] Error fetching assignments:', assignmentsError);
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

      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, full_name, company_id, designation, is_active, created_at, created_by_crm_user_id')
        .in('id', contactIds)
        .order('full_name', { ascending: true });

      if (contactsError) {
        console.error('[DirectoryTab] Error fetching contacts:', contactsError);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      const contactsList: DirectoryContact[] = (contactsData || []).map((c: any) => ({
        ...c,
        stage: assignmentsByContact[c.id]?.stage || null,
      }));

      setContacts(contactsList);

      const companyIds = contactsList
        .map(c => c.company_id)
        .filter((id): id is string => id !== null);

      if (companyIds.length > 0) {
        const namesResult = await getCompanyNamesMap(companyIds);
        if (namesResult.data) setCompanyNamesMap(namesResult.data);
      }

      if (contactIds.length > 0) {
        const ownersResult = await getOwnersForContacts(contactIds);
        if (ownersResult.data) {
          setOwnersMap(ownersResult.data);

          const ownerUserIds = new Set<string>();
          Object.values(ownersResult.data).forEach(owners => {
            if (owners.primary?.assigned_to_crm_user_id) ownerUserIds.add(owners.primary.assigned_to_crm_user_id);
            if (owners.secondary?.assigned_to_crm_user_id) ownerUserIds.add(owners.secondary.assigned_to_crm_user_id);
          });

          if (ownerUserIds.size > 0) {
            const ownerNamesResult = await getUserNames(Array.from(ownerUserIds));
            if (ownerNamesResult.data) setOwnerNamesMap(ownerNamesResult.data);
          }
        }
      }

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
      console.error('[DirectoryTab] Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    if (statusFilter === 'active') {
      filtered = filtered.filter(c => c.is_active !== false);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(c => c.is_active === false);
    }

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

    // User filter from chips
    if (userFilter) {
      filtered = filtered.filter(c => {
        const owners = ownersMap[c.id];
        if (!owners) return false;
        if (userFilter.role === 'PRIMARY') {
          return owners.primary?.assigned_to_crm_user_id === userFilter.crmUserId;
        }
        return owners.secondary?.assigned_to_crm_user_id === userFilter.crmUserId;
      });
    }

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
  }, [contacts, nameFilter, companyFilter, sortConfig, companyNamesMap, statusFilter, userFilter, ownersMap]);

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

  // Selection helpers
  const visibleIds = filteredContacts.map(c => c.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleIds);
    }
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
        {/* User chips filter strip */}
        <DirectoryUserChips
          ownersMap={ownersMap}
          ownerNamesMap={ownerNamesMap}
          selectedFilter={userFilter}
          onFilterChange={setUserFilter}
        />

        {/* Bulk toolbar (admin only, when selected) */}
        {isAdmin && selectedIds.length > 0 && (
          <DirectoryBulkToolbar
            selectedIds={selectedIds}
            onClearSelection={() => setSelectedIds([])}
            onComplete={handleBulkComplete}
          />
        )}

        <div className="flex items-center gap-2 mb-3">
          <Input
            placeholder="Filter by name…"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="h-8 w-[180px] text-sm"
          />
          <Input
            placeholder="Filter by company…"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-8 w-[180px] text-sm"
          />
          <div className="flex items-center gap-1.5 ml-auto">
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
                  <TableHead>Added By</TableHead>
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
                  const primaryOwnerId = owners?.primary?.assigned_to_crm_user_id;
                  const secondaryOwnerId = owners?.secondary?.assigned_to_crm_user_id;
                  const creatorId = contact.created_by_crm_user_id;
                  const isSelected = selectedIds.includes(contact.id);

                  return (
                    <TableRow key={contact.id} className={isSelected ? 'bg-primary/5' : ''}>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {creatorId
                          ? ownerNamesMap[creatorId] || 'System'
                          : <span className="text-muted-foreground/50">System</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {primaryOwnerId ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-0 font-medium">
                            {ownerNamesMap[primaryOwnerId] || 'Unknown'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground border-dashed font-normal">
                            Unassigned
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {secondaryOwnerId ? (
                          <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 border-0 font-medium">
                            {ownerNamesMap[secondaryOwnerId] || 'Unknown'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
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
