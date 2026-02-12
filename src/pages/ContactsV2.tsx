import { useEffect } from 'react';
import { BookOpen, User, Users2, UserPlus, Search, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
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
import {
  useContactsV2Data,
  STAGE_CHIPS,
  type TabKey,
  type StageFilter,
  type ContactV2Row,
} from '@/hooks/useContactsV2Data';

// ── Constants ────────────────────────────────────────────────────
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
function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">Active</Badge>
  ) : (
    <Badge variant="outline" className="text-xs border-muted text-muted-foreground">Inactive</Badge>
  );
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
                <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Contacts table ───────────────────────────────────────────────
function ContactsV2Table({ rows, activeTab }: { rows: ContactV2Row[]; activeTab: TabKey }) {
  const showOwners = activeTab === 'directory';

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
            <TableHead className="min-w-[160px]">Email</TableHead>
            <TableHead className="min-w-[120px]">Phone</TableHead>
            {showOwners && <TableHead className="min-w-[120px]">Primary Owner</TableHead>}
            {showOwners && <TableHead className="min-w-[120px]">Secondary Owner</TableHead>}
            <TableHead className="min-w-[100px]">Stage</TableHead>
            <TableHead className="min-w-[80px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.full_name || '—'}</TableCell>
              <TableCell>
                {row.company_name ? (
                  <Badge variant="secondary" className="text-xs">{row.company_name}</Badge>
                ) : (
                  <span className="text-muted-foreground/50">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.designation || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{row.email || '—'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{row.phone || '—'}</TableCell>
              {showOwners && (
                <TableCell className="text-sm text-muted-foreground">{row.primary_owner || '—'}</TableCell>
              )}
              {showOwners && (
                <TableCell className="text-sm text-muted-foreground">{row.secondary_owner || '—'}</TableCell>
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
function Pagination({
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
      <p className="text-xs text-muted-foreground">{totalRows} result{totalRows !== 1 ? 's' : ''}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {page + 1} / {totalPages}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
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
    filteredRows,
    pagedRows,
    stageCounts,
    totalPages,
    changeTab,
    setStageFilter,
    setSearch,
    setPage,
    fetchData,
  } = useContactsV2Data();

  // Initial fetch
  useEffect(() => {
    if (!authLoading) {
      fetchData(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
        <p className="mt-1 text-muted-foreground">Browse and manage your contacts</p>
      </div>

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

      {/* Stage chips + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StageChipBar counts={stageCounts} active={stageFilter} onChange={setStageFilter} />
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search name, company, email, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
      {isLoading ? <TableSkeleton /> : <ContactsV2Table rows={pagedRows} activeTab={activeTab} />}

      {/* Pagination */}
      {!isLoading && (
        <Pagination page={page} totalPages={totalPages} totalRows={filteredRows.length} onPageChange={setPage} />
      )}
    </div>
  );
}
