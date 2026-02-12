import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

// ── Normalised row shape ───────────────────────────────────────────
export interface ContactV2Row {
  id: string;
  full_name: string;
  company_name: string;
  designation: string;
  email: string;
  phone: string;
  primary_owner: string;
  secondary_owner: string;
  stage: string;
  is_active: boolean;
  updated_at: string;
  last_interaction_at: string;
}

export type TabKey = 'directory' | 'my-primary' | 'my-secondary' | 'my-added';

export type StageFilter = 'ALL' | 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

export const STAGE_CHIPS: { value: StageFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const VIEW_MAP: Record<TabKey, string> = {
  directory: 'v_directory_contacts',
  'my-primary': 'v_my_primary_contacts',
  'my-secondary': 'v_my_secondary_contacts',
  'my-added': 'v_my_added_unassigned',
};

// Normalize any view row into common shape
function normalize(row: Record<string, any>): ContactV2Row {
  return {
    id: row.id ?? row.contact_id ?? '',
    full_name: row.full_name ?? '',
    company_name: row.company_name ?? '',
    designation: row.designation ?? '',
    email: row.email ?? '',
    phone: row.primary_phone ?? row.phone ?? '',
    primary_owner: row.primary_owner_name ?? row.primary_owner_id ?? '',
    secondary_owner: row.secondary_owner_name ?? row.secondary_owner_id ?? '',
    stage: (row.stage ?? row.primary_stage ?? '').toString().trim().toUpperCase(),
    is_active: row.is_active ?? true,
    updated_at: row.updated_at ?? '',
    last_interaction_at: row.last_interaction_at ?? '',
  };
}

const PAGE_SIZE = 50;

export function useContactsV2Data() {
  const { session, loading: authLoading } = useAuth();

  const [allRows, setAllRows] = useState<ContactV2Row[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('directory');
  const [stageFilter, setStageFilter] = useState<StageFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchData = useCallback(async (tab: TabKey) => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    setPage(0);

    try {
      const view = VIEW_MAP[tab];
      const { data, error: fetchErr } = await supabase
        .from(view)
        .select('*')
        .order('full_name', { ascending: true });

      if (fetchErr) {
        setError(fetchErr.message);
        setAllRows([]);
        return;
      }

      setAllRows((data || []).map(normalize));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed');
      setAllRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // ── Derived: stage counts from allRows ─────────────────────────
  const stageCounts = useMemo(() => {
    const counts: Record<StageFilter, number> = {
      ALL: allRows.length,
      COLD_CALLING: 0,
      ASPIRATION: 0,
      ACHIEVEMENT: 0,
      INACTIVE: 0,
    };
    allRows.forEach((r) => {
      if (r.stage in counts && r.stage !== 'ALL') {
        counts[r.stage as StageFilter]++;
      }
    });
    return counts;
  }, [allRows]);

  // ── Derived: filtered + searched rows ──────────────────────────
  const filteredRows = useMemo(() => {
    let rows = allRows;

    // Stage filter
    if (stageFilter !== 'ALL') {
      rows = rows.filter((r) => r.stage === stageFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      rows = rows.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.company_name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q)
      );
    }

    return rows;
  }, [allRows, stageFilter, search]);

  // ── Derived: paginated slice ───────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = useMemo(
    () => filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredRows, page]
  );

  // ── Tab change handler ─────────────────────────────────────────
  const changeTab = useCallback(
    (tab: TabKey) => {
      setActiveTab(tab);
      setStageFilter('ALL');
      setSearch('');
      setPage(0);
      fetchData(tab);
    },
    [fetchData]
  );

  return {
    // state
    activeTab,
    stageFilter,
    search,
    page,
    isLoading,
    error,
    authLoading,
    // data
    allRows,
    filteredRows,
    pagedRows,
    stageCounts,
    totalPages,
    // actions
    changeTab,
    setStageFilter: (sf: StageFilter) => { setStageFilter(sf); setPage(0); },
    setSearch: (s: string) => { setSearch(s); setPage(0); },
    setPage,
    refresh: () => fetchData(activeTab),
    fetchData,
  };
}
