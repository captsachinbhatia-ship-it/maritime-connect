import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  User,
  Users2,
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileUp,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { supabase } from '@/lib/supabaseClient';
import {
  useContactsV2Data,
  STAGE_CHIPS,
  type TabKey,
  type StageFilter,
  type ContactV2Row,
} from '@/hooks/useContactsV2Data';

// ── Tab metadata ─────────────────────────────────────────────────
const TAB_META: { value: TabKey; label: string; icon: React.ElementType }[] = [
  { value: 'directory', label: 'Directory', icon: BookOpen },
  { value: 'my-primary', label: 'My Primary', icon: User },
  { value: 'my-secondary', label: 'My Secondary', icon: Users2 },
  { value: 'my-added', label: 'My Added', icon: UserPlus },
];

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  ASPIRATION: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  ACHIEVEMENT: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  INACTIVE: 'bg-muted text-muted-foreground',
};

// ── Cumulative Bar (always visible) ──────────────────────────────
function CumulativeBar({
  directoryTotal,
  primaryTotal,
  secondaryTotal,
  unassignedTotal,
  myAddedTotal,
}: {
  directoryTotal: number;
  primaryTotal: number;
  secondaryTotal: number;
  unassignedTotal: number;
  myAddedTotal: number;
}) {
  const items = [
    { label: 'Directory (Clean)', value: directoryTotal },
    { label: 'Primary (Global)', value: primaryTotal },
    { label: 'Secondary (Global)', value: secondaryTotal },
    { label: 'Unassigned (Global)', value: unassignedTotal },
    { label: 'My Added (Me)', value: myAddedTotal },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge
          key={item.label}
          variant="outline"
          className="text-xs font-medium px-3 py-1.5 tabular-nums gap-1.5"
        >
          {item.label}: <span className="font-semibold">{item.value}</span>
        </Badge>
      ))}
    </div>
  );
}

// ── Stage chip bar ───────────────────────────────────────────────
function StageChipBar({
  counts,
  active,
  onChange,
}: {
  counts: Record<StageFilter, number>;
  active: StageFilter;
  onChange: (s: StageFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STAGE_CHIPS.map((chip) => {
        const isActive = active === chip.value;
        return (
          <button
            key={chip.value}
            onClick={() => onChange(chip.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors
              ${
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
          >
            {chip.label}
            <span className={`tabular-nums ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              {counts[chip.value] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────
function StatusBadge({ active }: { active: boolean | null }) {
  if (active === true) {
    return (
      <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
        Active
      </Badge>
    );
  }
  if (active === false) {
    return (
      <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
        Inactive
      </Badge>
    );
  }
  return <span className="text-muted-foreground/50">—</span>;
}

// ── Table skeleton ───────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Full Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 7 }).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Owner Summary (Directory only) with UNASSIGNED row ──────────
interface OwnerSummaryRow {
  assigned_to_name: string;
  primary_count: number;
  secondary_count: number;
  total_count: number;
}

function OwnerSummaryBlock({
  visible,
  directoryTotal,
}: {
  visible: boolean;
  directoryTotal: number;
}) {
  const [rows, setRows] = useState<OwnerSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    supabase
      .from('v_owner_summary_ui')
      .select('*')
      .order('total_count', { ascending: false })
      .then(({ data }) => {
        setRows((data as OwnerSummaryRow[]) || []);
        setLoading(false);
      });
  }, [visible]);

  const { sumPrimary, sumSecondary, sumTotal, unassignedTotal } = useMemo(() => {
    const sp = rows.reduce((a, r) => a + (r.primary_count || 0), 0);
    const ss = rows.reduce((a, r) => a + (r.secondary_count || 0), 0);
    const st = rows.reduce((a, r) => a + (r.total_count || 0), 0);
    const ua = Math.max(0, directoryTotal - st);
    return { sumPrimary: sp, sumSecondary: ss, sumTotal: st, unassignedTotal: ua };
  }, [rows, directoryTotal]);

  if (!visible) return null;
  if (loading) return <Skeleton className="h-24 w-full" />;
  if (rows.length === 0 && directoryTotal === 0) return null;

  return (
    <div>
      {/* Owner Summary Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Owner</TableHead>
              <TableHead className="min-w-[80px] text-right">Primary</TableHead>
              <TableHead className="min-w-[80px] text-right">Secondary</TableHead>
              <TableHead className="min-w-[80px] text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.assigned_to_name}>
                <TableCell className="font-medium">{r.assigned_to_name}</TableCell>
                <TableCell className="text-right tabular-nums">{r.primary_count}</TableCell>
                <TableCell className="text-right tabular-nums">{r.secondary_count}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{r.total_count}</TableCell>
              </TableRow>
            ))}
            {/* UNASSIGNED row */}
            <TableRow className="bg-muted/30">
              <TableCell className="font-medium text-destructive">⚠ UNASSIGNED</TableCell>
              <TableCell className="text-right tabular-nums">0</TableCell>
              <TableCell className="text-right tabular-nums">0</TableCell>
              <TableCell className="text-right tabular-nums font-semibold text-destructive">
                {unassignedTotal}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Contacts table ───────────────────────────────────────────────
function ContactsV2Table({ rows, activeTab }: { rows: ContactV2Row[]; activeTab: TabKey }) {
  const isDirectory = activeTab === 'directory';
  const showOwners = isDirectory;

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-10 text-center">
        <p className="text-muted-foreground">No contacts found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[160px]">Full Name</TableHead>
            <TableHead className="min-w-[140px]">Company</TableHead>
            <TableHead className="min-w-[120px]">Designation</TableHead>
            {!isDirectory && <TableHead className="min-w-[160px]">Email</TableHead>}
            {!isDirectory && <TableHead className="min-w-[120px]">Phone</TableHead>}
            {showOwners && <TableHead className="min-w-[120px]">Primary Owner</TableHead>}
            {showOwners && <TableHead className="min-w-[120px]">Secondary Owner</TableHead>}
            <TableHead className="min-w-[100px]">Stage</TableHead>
            <TableHead className="min-w-[80px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.full_name}</TableCell>
              <TableCell>
                {row.company_name ? (
                  <Badge variant="secondary" className="text-xs">
                    {row.company_name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.designation ?? '—'}</TableCell>
              {!isDirectory && (
                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                  {row.email ?? '—'}
                </TableCell>
              )}
              {!isDirectory && (
                <TableCell className="text-sm text-muted-foreground">{row.phone ?? '—'}</TableCell>
              )}
              {showOwners && (
                <TableCell className="text-sm text-muted-foreground">{row.primary_owner ?? '—'}</TableCell>
              )}
              {showOwners && (
                <TableCell className="text-sm text-muted-foreground">{row.secondary_owner ?? '—'}</TableCell>
              )}
              <TableCell>
                {row.stage ? (
                  <Badge className={`text-xs ${STAGE_COLORS[row.stage] || ''}`}>
                    {STAGE_CHIPS.find((c) => c.value === row.stage)?.label ?? row.stage}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge active={row.is_active} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────────
function PaginationBar({
  page,
  totalPages,
  totalRows,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">
        {totalRows} result{totalRows !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Hook for cumulative bar counts ───────────────────────────────
function useCumulativeCounts() {
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [primaryTotal, setPrimaryTotal] = useState(0);
  const [secondaryTotal, setSecondaryTotal] = useState(0);
  const [ownerTotalSum, setOwnerTotalSum] = useState(0);
  const [myAddedTotal, setMyAddedTotal] = useState(0);

  const unassignedTotal = Math.max(0, directoryTotal - ownerTotalSum);

  const refresh = async () => {
    const [dirRes, ownerRes, addedRes] = await Promise.all([
      supabase.from('v_directory_contacts_ro').select('*', { count: 'exact', head: true }),
      supabase.from('v_owner_summary_ui').select('*'),
      supabase.from('v_my_added_unassigned').select('*', { count: 'exact', head: true }),
    ]);

    setDirectoryTotal(dirRes.count ?? 0);
    setMyAddedTotal(addedRes.count ?? 0);

    const ownerRows = (ownerRes.data || []) as OwnerSummaryRow[];
    setPrimaryTotal(ownerRows.reduce((a, r) => a + (r.primary_count || 0), 0));
    setSecondaryTotal(ownerRows.reduce((a, r) => a + (r.secondary_count || 0), 0));
    setOwnerTotalSum(ownerRows.reduce((a, r) => a + (r.total_count || 0), 0));
  };

  return { directoryTotal, primaryTotal, secondaryTotal, unassignedTotal, myAddedTotal, refresh };
}

// ── Main page ────────────────────────────────────────────────────
export default function ContactsV2() {
  const {
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
    fetchAll,
  } = useContactsV2Data();

  const cumulative = useCumulativeCounts();

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
    }, 350);
  };

  // Initial fetch
  useEffect(() => {
    if (!authLoading) {
      fetchAll(activeTab, 'ALL', '', 0);
      cumulative.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Refresh cumulative on tab/filter changes
  useEffect(() => {
    if (!authLoading) {
      cumulative.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, stageFilter, search]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isDirectory = activeTab === 'directory';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="mt-1 text-muted-foreground">Browse and manage your contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/contacts/bulk-import">
              <FileUp className="mr-2 h-4 w-4" />
              Bulk Import
            </Link>
          </Button>
          <AddContactModal onSuccess={() => fetchAll(activeTab, stageFilter, search, page)} />
        </div>
      </div>

      {/* Unified Summary Strip */}
      <CumulativeBar
        directoryTotal={cumulative.directoryTotal}
        primaryTotal={cumulative.primaryTotal}
        secondaryTotal={cumulative.secondaryTotal}
        unassignedTotal={cumulative.unassignedTotal}
        myAddedTotal={cumulative.myAddedTotal}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => changeTab(v as TabKey)}>
        <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground">
          {TAB_META.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Owner Summary Table (Directory only) */}
      {isDirectory && (
        <OwnerSummaryBlock visible directoryTotal={totalRows} />
      )}

      {/* Stage chips + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StageChipBar counts={stageCounts} active={stageFilter} onChange={setStageFilter} />
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            key={activeTab}
            type="text"
            placeholder={isDirectory ? 'Search name, company…' : 'Search name, company, email, phone…'}
            defaultValue={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      {isLoading ? <TableSkeleton /> : <ContactsV2Table rows={rows} activeTab={activeTab} />}

      {/* Pagination */}
      {!isLoading && (
        <PaginationBar page={page} totalPages={totalPages} totalRows={totalRows} onPageChange={changePage} />
      )}
    </div>
  );
}
