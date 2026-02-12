import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ────────────────────────────────────────────────────────
export interface ContactV2Row {
  id: string;
  full_name: string;
  company_name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  primary_owner: string | null;
  secondary_owner: string | null;
  stage: StageFilter | null;
  is_active: boolean | null;
  updated_at: string | null;
  last_interaction_at: string | null;
}

export type TabKey = 'directory' | 'my-primary' | 'my-secondary' | 'my-added';

export type StageFilter = 'ALL' | 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

const STAGES: StageFilter[] = ['COLD_CALLING', 'ASPIRATION', 'ACHIEVEMENT', 'INACTIVE'];

export const STAGE_CHIPS: { value: StageFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

// ── View maps ────────────────────────────────────────────────────
const VIEW_MAP: Record<TabKey, string> = {
  directory: 'v_directory_contacts',
  'my-primary': 'v_my_primary_contacts',
  'my-secondary': 'v_my_secondary_contacts',
  'my-added': 'v_my_added_unassigned',
};

const STAGE_COUNT_VIEW_MAP: Record<TabKey, string> = {
  directory: 'v_directory_stage_counts',
  'my-primary': 'v_my_primary_stage_counts',
  'my-secondary': 'v_my_secondary_stage_counts',
  'my-added': 'v_my_added_stage_counts',
};

// ── Helpers ──────────────────────────────────────────────────────
function normalizeStage(raw: any): StageFilter | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
  return STAGES.includes(s as StageFilter) ? (s as StageFilter) : null;
}

function normalize(row: any): ContactV2Row {
  if (!row.id && !row.contact_id) throw new Error('Missing id');
  if (!row.full_name) throw new Error('Missing full_name for row ' + (row.id ?? row.contact_id));

  return {
    id: row.id ?? row.contact_id,
    full_name: row.full_name,
    company_name: row.company_name ?? null,
    designation: row.designation ?? null,
    email: row.email ?? null,
    phone: row.primary_phone ?? row.phone ?? null,
    primary_owner: row.primary_owner_name ?? null,
    secondary_owner: row.secondary_owner_name ?? null,
    stage: normalizeStage(row.stage ?? row.primary_stage),
    is_active: typeof row.is_active === 'boolean' ? row.is_active : null,
    updated_at: row.updated_at ?? null,
    last_interaction_at: row.last_interaction_at ?? null,
  };
}

const PAGE_SIZE = 50;

// ── Hook ─────────────────────────────────────────────────────────
export function useContactsV2Data() {
  const { session, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<ContactV2Row[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('directory');
  const [stageFilter, setStageFilterState] = useState<StageFilter>('ALL');
  const [search, setSearchState] = useState('');
  const [page, setPage] = useState(0);

  const [stageCounts, setStageCounts] = useState<Record<StageFilter, number>>({
    ALL: 0,
    COLD_CALLING: 0,
    ASPIRATION: 0,
    ACHIEVEMENT: 0,
    INACTIVE: 0,
  });

  // ── Fetch stage counts ─────────────────────────────────────────
  const fetchStageCounts = useCallback(async (tab: TabKey) => {
    const view = STAGE_COUNT_VIEW_MAP[tab];
    try {
      const { data, error: err } = await supabase.from(view).select('*');
      if (err) {
        console.error('Stage count fetch failed:', err.message);
        return;
      }
      const counts: Record<StageFilter, number> = {
        ALL: 0,
        COLD_CALLING: 0,
        ASPIRATION: 0,
        ACHIEVEMENT: 0,
        INACTIVE: 0,
      };
      (data || []).forEach((r: any) => {
        const stage = normalizeStage(r.stage);
        const cnt = Number(r.cnt ?? r.count ?? 0);
        if (stage && stage in counts) {
          counts[stage] += cnt;
        }
        counts.ALL += cnt;
      });
      setStageCounts(counts);
    } catch {
      console.error('Stage count fetch exception');
    }
  }, []);

  // ── Fetch paginated contacts ───────────────────────────────────
  const fetchContacts = useCallback(
    async (tab: TabKey, sf: StageFilter, q: string, p: number) => {
      if (!session) return;
      setIsLoading(true);
      setError(null);

      const view = VIEW_MAP[tab];
      const from = p * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      try {
        let query = supabase
          .from(view)
          .select('*', { count: 'exact' })
          .order('full_name', { ascending: true })
          .range(from, to);

        if (sf !== 'ALL') {
          query = query.eq('stage', sf);
        }

        if (q.trim()) {
          const term = q.trim();
          query = query.or(
            `full_name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%,primary_phone.ilike.%${term}%`
          );
        }

        const { data, count, error: fetchErr } = await query;

        if (fetchErr) {
          setError(fetchErr.message);
          setRows([]);
          setTotalRows(0);
          return;
        }

        const normalized: ContactV2Row[] = [];
        (data || []).forEach((row: any) => {
          try {
            normalized.push(normalize(row));
          } catch (e) {
            console.warn('Skipping row:', e instanceof Error ? e.message : e);
          }
        });

        setRows(normalized);
        setTotalRows(count ?? normalized.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fetch failed');
        setRows([]);
        setTotalRows(0);
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  // ── Combined fetch ─────────────────────────────────────────────
  const fetchAll = useCallback(
    async (tab: TabKey, sf: StageFilter, q: string, p: number) => {
      await Promise.all([fetchStageCounts(tab), fetchContacts(tab, sf, q, p)]);
    },
    [fetchStageCounts, fetchContacts]
  );

  // ── Tab change ─────────────────────────────────────────────────
  const changeTab = useCallback(
    (tab: TabKey) => {
      setActiveTab(tab);
      setStageFilterState('ALL');
      setSearchState('');
      setPage(0);
      fetchAll(tab, 'ALL', '', 0);
    },
    [fetchAll]
  );

  // ── Stage filter change ────────────────────────────────────────
  const setStageFilter = useCallback(
    (sf: StageFilter) => {
      setStageFilterState(sf);
      setPage(0);
      fetchContacts(activeTab, sf, search, 0);
    },
    [activeTab, search, fetchContacts]
  );

  // ── Search change ──────────────────────────────────────────────
  const setSearch = useCallback(
    (q: string) => {
      setSearchState(q);
      setPage(0);
      fetchContacts(activeTab, stageFilter, q, 0);
    },
    [activeTab, stageFilter, fetchContacts]
  );

  // ── Page change ────────────────────────────────────────────────
  const changePage = useCallback(
    (p: number) => {
      setPage(p);
      fetchContacts(activeTab, stageFilter, search, p);
    },
    [activeTab, stageFilter, search, fetchContacts]
  );

  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  return {
    activeTab,
    stageFilter,
    search,
    page,
    isLoading,
    error,
    authLoading,
    rows,
    totalRows,
    totalPages,
    stageCounts,
    changeTab,
    setStageFilter,
    setSearch,
    changePage,
    refresh: () => fetchAll(activeTab, stageFilter, search, page),
    fetchAll,
  };
}
