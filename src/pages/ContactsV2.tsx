import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  MoreHorizontal,
  Eye,
  Pencil,
  Phone as PhoneIcon,
  CalendarClock,
  Trash2,
  Archive,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { ContactDetailsDrawer } from '@/components/contacts/ContactDetailsDrawer';
import { AssignContactModal } from '@/components/contacts/AssignContactModal';
import { LogInteractionDialog } from '@/components/contacts/LogInteractionDialog';
import { AddFollowupModal } from '@/components/contacts/AddFollowupModal';
import { StageDropdown } from '@/components/contacts/StageDropdown';
import { EditContactModal } from '@/components/contacts/EditContactModal';
import { DeleteContactDialog } from '@/components/contacts/DeleteContactDialog';
import { DirectoryBulkToolbar } from '@/components/contacts/DirectoryBulkToolbar';
import { InlineOwnerSelector } from '@/components/contacts/InlineOwnerSelector';
import { supabase } from '@/lib/supabaseClient';
import { useCrmUser } from '@/hooks/useCrmUser';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ContactWithCompany } from '@/types';
import { type AssignmentStage } from '@/services/assignments';
import {
  useContactsV2Data,
  STAGE_CHIPS,
  type TabKey,
  type StageFilter,
  type ContactV2Row,
  type OwnerFilterState,
} from '@/hooks/useContactsV2Data';

// ── Alphabet letters ─────────────────────────────────────────────
const ALPHA_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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

// ── Cumulative Bar (clickable chips) ─────────────────────────────
function CumulativeBar({
  directoryTotal,
  primaryTotal,
  secondaryTotal,
  unassignedTotal,
  myAddedTotal,
  activeTab,
  onNavigate,
}: {
  directoryTotal: number;
  primaryTotal: number;
  secondaryTotal: number;
  unassignedTotal: number;
  myAddedTotal: number;
  activeTab: TabKey;
  onNavigate: (action: string) => void;
}) {
  const items: { label: string; value: number; action: string; active?: boolean }[] = [
    { label: 'All Contacts', value: directoryTotal, action: 'directory', active: activeTab === 'directory' },
    { label: 'Primary', value: primaryTotal, action: 'my-primary', active: activeTab === 'my-primary' },
    { label: 'Secondary', value: secondaryTotal, action: 'my-secondary', active: activeTab === 'my-secondary' },
    { label: 'Unassigned', value: unassignedTotal, action: 'unassigned' },
    { label: 'My Added', value: myAddedTotal, action: 'my-added', active: activeTab === 'my-added' },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => onNavigate(item.action)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer
            ${item.active
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
        >
          {item.label}: <span className="font-semibold tabular-nums">{item.value}</span>
        </button>
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

// ── A-Z Filter Bar ──────────────────────────────────────────────
function AlphaFilterBar({
  active,
  onChange,
}: {
  active: string | null;
  onChange: (letter: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-0.5">
      <button
        onClick={() => onChange(null)}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          active === null
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        All
      </button>
      {ALPHA_LETTERS.map((l) => (
        <button
          key={l}
          onClick={() => onChange(active === l ? null : l)}
          className={`px-1.5 py-1 text-xs font-medium rounded transition-colors ${
            active === l
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          {l}
        </button>
      ))}
      <button
        onClick={() => onChange(active === '#' ? null : '#')}
        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
          active === '#'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        #
      </button>
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
            <TableHead className="w-10" />
            <TableHead>Full Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 9 }).map((_, j) => (
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

// ── Owner Summary (Directory only) with clickable counts ────────
interface OwnerSummaryRow {
  assigned_to_name: string;
  assigned_to_crm_user_id: string;
  primary_count: number;
  secondary_count: number;
  total_count: number;
}

function OwnerSummaryBlock({
  visible,
  directoryTotal,
  activeOwnerFilter,
  onOwnerFilter,
}: {
  visible: boolean;
  directoryTotal: number;
  activeOwnerFilter: OwnerFilterState;
  onOwnerFilter: (of: OwnerFilterState) => void;
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

  const { sumTotal, unassignedTotal } = useMemo(() => {
    const st = rows.reduce((a, r) => a + (r.total_count || 0), 0);
    const ua = Math.max(0, directoryTotal - st);
    return { sumTotal: st, unassignedTotal: ua };
  }, [rows, directoryTotal]);

  if (!visible) return null;
  if (loading) return <Skeleton className="h-24 w-full" />;
  if (rows.length === 0 && directoryTotal === 0) return null;

  const isFilterActive = (userId: string | null, role: 'PRIMARY' | 'SECONDARY' | 'ANY' | null, unassigned: boolean) => {
    return activeOwnerFilter.userId === userId && activeOwnerFilter.role === role && activeOwnerFilter.unassigned === unassigned;
  };

  const handleClick = (userId: string | null, role: 'PRIMARY' | 'SECONDARY' | 'ANY' | null, unassigned: boolean) => {
    // Toggle: if already active, clear filter
    if (isFilterActive(userId, role, unassigned)) {
      onOwnerFilter({ userId: null, role: null, unassigned: false });
    } else {
      onOwnerFilter({ userId, role, unassigned });
    }
  };

  const countCellClass = (userId: string | null, role: 'PRIMARY' | 'SECONDARY' | 'ANY' | null, unassigned: boolean) =>
    `text-right tabular-nums cursor-pointer transition-colors rounded px-1 ${
      isFilterActive(userId, role, unassigned)
        ? 'bg-primary/15 text-primary font-bold'
        : 'hover:bg-accent hover:text-accent-foreground'
    }`;

  return (
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
            <TableRow key={r.assigned_to_crm_user_id || r.assigned_to_name}>
              <TableCell className="font-medium">{r.assigned_to_name}</TableCell>
              <TableCell
                className={countCellClass(r.assigned_to_crm_user_id, 'PRIMARY', false)}
                onClick={() => handleClick(r.assigned_to_crm_user_id, 'PRIMARY', false)}
              >
                {r.primary_count}
              </TableCell>
              <TableCell
                className={countCellClass(r.assigned_to_crm_user_id, 'SECONDARY', false)}
                onClick={() => handleClick(r.assigned_to_crm_user_id, 'SECONDARY', false)}
              >
                {r.secondary_count}
              </TableCell>
              <TableCell
                className={countCellClass(r.assigned_to_crm_user_id, 'ANY', false)}
                onClick={() => handleClick(r.assigned_to_crm_user_id, 'ANY', false)}
              >
                <span className="font-semibold">{r.total_count}</span>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/30">
            <TableCell className="font-medium text-destructive">⚠ UNASSIGNED</TableCell>
            <TableCell className="text-right tabular-nums">0</TableCell>
            <TableCell className="text-right tabular-nums">0</TableCell>
            <TableCell
              className={countCellClass(null, null, true)}
              onClick={() => handleClick(null, null, true)}
            >
              <span className="font-semibold text-destructive">{unassignedTotal}</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

// ── Helper: Convert V2Row to ContactWithCompany for drawer ──────
function rowToContactWithCompany(row: ContactV2Row): ContactWithCompany {
  return {
    id: row.id,
    full_name: row.full_name,
    company_id: null,
    designation: row.designation,
    country_code: null,
    phone: row.phone,
    phone_type: null,
    email: row.email,
    ice_handle: null,
    preferred_channel: null,
    notes: null,
    is_active: row.is_active,
    updated_at: row.updated_at,
    company_name: row.company_name ?? undefined,
    last_interaction_at: row.last_interaction_at,
  };
}

// ── Permission helper ─────────────────────────────────────────────
function canAccessContact(
  row: ContactV2Row,
  crmUserId: string | null,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true;
  if (!crmUserId) return false;
  return row.primary_owner_id === crmUserId || row.secondary_owner_id === crmUserId;
}

// ── Row Actions Menu ─────────────────────────────────────────────
function RowActionsMenu({
  row,
  isAdmin,
  hasAccess,
  isDirectory,
  onView,
  onEdit,
  onLogInteraction,
  onAddFollowup,
  onArchive,
  onDelete,
}: {
  row: ContactV2Row;
  isAdmin: boolean;
  hasAccess: boolean;
  isDirectory: boolean;
  onView: () => void;
  onEdit: () => void;
  onLogInteraction: () => void;
  onAddFollowup: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  // Non-admin on Directory: only show View Details if they have access
  const directoryNonAdmin = isDirectory && !isAdmin;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {directoryNonAdmin ? (
          hasAccess ? (
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <Eye className="mr-2 h-4 w-4" />
              Access restricted
            </DropdownMenuItem>
          )
        ) : (
          <>
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {hasAccess && (
              <>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogInteraction}>
                  <PhoneIcon className="mr-2 h-4 w-4" />
                  Log Interaction
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddFollowup}>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Add Follow-up
                </DropdownMenuItem>
              </>
            )}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onArchive} className="text-destructive">
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Contacts table with actions ─────────────────────────────────
function ContactsV2Table({
  rows,
  activeTab,
  isAdmin,
  crmUserId,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  allSelected,
  onRowClick,
  onRowAction,
  onInlineAssign,
  onInlineRemove,
}: {
  rows: ContactV2Row[];
  activeTab: TabKey;
  isAdmin: boolean;
  crmUserId: string | null;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  onRowClick: (row: ContactV2Row) => void;
  onRowAction: (action: string, row: ContactV2Row) => void;
  onInlineAssign: (contactId: string, userId: string, role: 'PRIMARY' | 'SECONDARY') => Promise<void>;
  onInlineRemove: (contactId: string, role: 'PRIMARY' | 'SECONDARY') => Promise<void>;
}) {
  const isDirectory = activeTab === 'directory';
  const showOwners = isDirectory;
  const showSecondaryCol = activeTab === 'my-primary';
  const showPrimaryCol = activeTab === 'my-secondary';

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-10 text-center">
        <p className="text-muted-foreground">No contacts found.</p>
      </div>
    );
  }

  const handleRowClick = (e: React.MouseEvent, row: ContactV2Row) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, [role="menuitem"], [role="checkbox"], input, a, [data-no-row-click]')) return;
    onRowClick(row);
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="min-w-[160px]">Full Name</TableHead>
            <TableHead className="min-w-[140px]">Company</TableHead>
            <TableHead className="min-w-[120px]">Designation</TableHead>
            {!isDirectory && <TableHead className="min-w-[160px]">Email</TableHead>}
            {!isDirectory && <TableHead className="min-w-[120px]">Phone</TableHead>}
            {showOwners && <TableHead className="min-w-[120px]">Primary Owner</TableHead>}
            {showOwners && <TableHead className="min-w-[120px]">Secondary Owner</TableHead>}
            {showSecondaryCol && <TableHead className="min-w-[120px]">Secondary Owner</TableHead>}
            {showPrimaryCol && <TableHead className="min-w-[120px]">Primary Owner</TableHead>}
            <TableHead className="min-w-[100px]">Stage</TableHead>
            <TableHead className="min-w-[80px]">Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isUnassigned = isDirectory && !row.primary_owner;
            const clickable = !(isDirectory && !isAdmin);
            return (
            <TableRow
              key={row.id}
              className={`${clickable ? 'cursor-pointer' : ''} hover:bg-accent/50 ${isUnassigned ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}`}
              onClick={(e) => handleRowClick(e, row)}
            >
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(row.id)}
                  onCheckedChange={() => onToggleSelect(row.id)}
                  aria-label={`Select ${row.full_name}`}
                />
              </TableCell>
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
                <TableCell className={!row.primary_owner ? 'bg-amber-100/60 dark:bg-amber-950/30' : ''}>
                  {isAdmin ? (
                    <InlineOwnerSelector
                      contactId={row.id}
                      currentOwnerName={row.primary_owner ?? null}
                      role="PRIMARY"
                      onAssign={onInlineAssign}
                      onRemove={onInlineRemove}
                    />
                  ) : (
                    <span className={`text-xs font-medium ${row.primary_owner ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                      {row.primary_owner ?? 'Unassigned'}
                    </span>
                  )}
                </TableCell>
              )}
              {showOwners && (
                <TableCell>
                  {isAdmin ? (
                    <InlineOwnerSelector
                      contactId={row.id}
                      currentOwnerName={row.secondary_owner ?? null}
                      role="SECONDARY"
                      excludeUserId={row.primary_owner_id}
                      onAssign={onInlineAssign}
                      onRemove={onInlineRemove}
                    />
                  ) : (
                    <span className={`text-xs font-medium ${row.secondary_owner ? '' : 'text-muted-foreground'}`}>
                      {row.secondary_owner ?? '—'}
                    </span>
                  )}
                </TableCell>
              )}
              {showSecondaryCol && (
                <TableCell className="text-sm text-muted-foreground">
                  {row.secondary_owner ?? '—'}
                </TableCell>
              )}
              {showPrimaryCol && (
                <TableCell className="text-sm text-muted-foreground">
                  {row.primary_owner ?? '—'}
                </TableCell>
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
              <TableCell>
                <RowActionsMenu
                  row={row}
                  isAdmin={isAdmin}
                  hasAccess={canAccessContact(row, crmUserId, isAdmin)}
                  isDirectory={isDirectory}
                  onView={() => onRowAction('view', row)}
                  onEdit={() => onRowAction('edit', row)}
                  onLogInteraction={() => onRowAction('log-interaction', row)}
                  onAddFollowup={() => onRowAction('add-followup', row)}
                  onArchive={() => onRowAction('archive', row)}
                  onDelete={() => onRowAction('delete', row)}
                />
              </TableCell>
            </TableRow>
            );
          })}
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
  compact,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  onPageChange: (p: number) => void;
  compact?: boolean;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'justify-between pt-2'}`}>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          {totalRows} result{totalRows !== 1 ? 's' : ''}
        </p>
      )}
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
function useCumulativeCounts(isAdmin: boolean) {
  const { crmUserId } = useCrmUser();
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [primaryTotal, setPrimaryTotal] = useState(0);
  const [secondaryTotal, setSecondaryTotal] = useState(0);
  const [ownerTotalSum, setOwnerTotalSum] = useState(0);
  const [myAddedTotal, setMyAddedTotal] = useState(0);

  const unassignedTotal = Math.max(0, directoryTotal - ownerTotalSum);

  const refresh = useCallback(async () => {
    // My Added query
    const addedQuery = crmUserId
      ? supabase.from('v_directory_contacts_ro').select('*', { count: 'exact', head: true }).eq('created_by_crm_user_id', crmUserId).is('primary_owner_id', null)
      : null;

    // User-scoped primary/secondary counts (for non-admin)
    const userPrimaryQuery = (!isAdmin && crmUserId)
      ? supabase.from('v_my_primary_contacts').select('*', { count: 'exact', head: true })
      : null;
    const userSecondaryQuery = (!isAdmin && crmUserId)
      ? supabase.from('v_my_secondary_contacts').select('*', { count: 'exact', head: true })
      : null;

    const [dirRes, ownerRes, addedRes, userPrimRes, userSecRes] = await Promise.all([
      supabase.from('v_directory_contacts_ro').select('*', { count: 'exact', head: true }),
      supabase.from('v_owner_summary_ui').select('*'),
      addedQuery ?? Promise.resolve({ count: 0 } as any),
      userPrimaryQuery ?? Promise.resolve({ count: null } as any),
      userSecondaryQuery ?? Promise.resolve({ count: null } as any),
    ]);

    setDirectoryTotal(dirRes.count ?? 0);
    setMyAddedTotal(addedRes.count ?? 0);

    const ownerRows = (ownerRes.data || []) as OwnerSummaryRow[];
    const globalPrimary = ownerRows.reduce((a, r) => a + (r.primary_count || 0), 0);
    const globalSecondary = ownerRows.reduce((a, r) => a + (r.secondary_count || 0), 0);
    setOwnerTotalSum(ownerRows.reduce((a, r) => a + (r.total_count || 0), 0));

    if (isAdmin) {
      setPrimaryTotal(globalPrimary);
      setSecondaryTotal(globalSecondary);
    } else {
      setPrimaryTotal(userPrimRes.count ?? 0);
      setSecondaryTotal(userSecRes.count ?? 0);
    }
  }, [crmUserId, isAdmin]);

  return { directoryTotal, primaryTotal, secondaryTotal, unassignedTotal, myAddedTotal, refresh };
}

// ── Main page ────────────────────────────────────────────────────
export default function ContactsV2() {
  const { isAdmin } = useAuth();
  const { crmUserId } = useCrmUser();
  const { toast } = useToast();

  const {
    activeTab,
    stageFilter,
    search,
    alphaFilter,
    ownerFilter,
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
    setAlphaFilter,
    setOwnerFilter,
    changePage,
    fetchAll,
  } = useContactsV2Data();

  const cumulative = useCumulativeCounts(isAdmin);

  // ── Selection state ────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visibleIds = rows.map((r) => r.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(visibleIds);
  };

  // Clear selection on tab/filter change
  useEffect(() => {
    setSelectedIds([]);
  }, [activeTab, stageFilter, search, page]);

  // ── Drawer state ───────────────────────────────────────────────
  const [drawerContact, setDrawerContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStage, setDrawerStage] = useState<string | null>(null);
  const [drawerRestricted, setDrawerRestricted] = useState(false);

  // ── Modal states ───────────────────────────────────────────────
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignRole, setAssignRole] = useState<'primary' | 'secondary'>('primary');
  const [actionContactId, setActionContactId] = useState<string>('');
  const [actionContactName, setActionContactName] = useState<string>('');

  const [interactionOpen, setInteractionOpen] = useState(false);
  const [followupOpen, setFollowupOpen] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<ContactWithCompany | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteContact, setDeleteContact] = useState<ContactWithCompany | null>(null);

  // ── Refetch everything after a write ──────────────────────────
  const refetchAll = useCallback(async () => {
    await Promise.all([
      fetchAll(activeTab, stageFilter, search, page, alphaFilter, ownerFilter),
      cumulative.refresh(),
    ]);
  }, [activeTab, stageFilter, search, page, alphaFilter, ownerFilter, fetchAll, cumulative]);

  // ── Archive handler ───────────────────────────────────────────
  const handleArchive = useCallback(async (contactId: string, contactName: string) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`⚠️ Archive "${contactName}"?\n\nThis will hide the contact from all lists.\n\nContinue?`);
    if (!confirmed) return;

    const now = new Date().toISOString();
    const { error: archErr } = await supabase
      .from('contacts')
      .update({ is_archived: true, archived_at: now })
      .eq('id', contactId);

    if (archErr) {
      toast({ title: 'Archive failed', description: archErr.message, variant: 'destructive' });
      return;
    }

    // Close active assignments
    await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED', ended_at: now })
      .eq('contact_id', contactId)
      .eq('status', 'ACTIVE');

    toast({ title: 'Contact archived', description: `"${contactName}" has been archived.` });
    await refetchAll();
  }, [isAdmin, toast, refetchAll]);

  // ── Remove assignment handler ─────────────────────────────────
  const handleRemoveAssignment = useCallback(async (contactId: string, contactName: string) => {
    const confirmed = window.confirm(`Remove all assignments from "${contactName}"?`);
    if (!confirmed) return;

    const now = new Date().toISOString();
    const { error: err } = await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED', ended_at: now })
      .eq('contact_id', contactId)
      .eq('status', 'ACTIVE');

    if (err) {
      toast({ title: 'Remove failed', description: err.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Assignments removed' });
    await refetchAll();
  }, [toast, refetchAll]);

  // ── Row action dispatcher ─────────────────────────────────────
  const handleRowAction = useCallback((action: string, row: ContactV2Row) => {
    const contact = rowToContactWithCompany(row);
    const hasAccess = canAccessContact(row, crmUserId, isAdmin);

    switch (action) {
      case 'view':
        setDrawerContact(contact);
        setDrawerStage(row.stage);
        setDrawerRestricted(!hasAccess);
        setDrawerOpen(true);
        break;
      case 'edit':
        if (!hasAccess) return;
        setEditContact(contact);
        setEditModalOpen(true);
        break;
      case 'log-interaction':
        if (!hasAccess) return;
        setActionContactId(row.id);
        setActionContactName(row.full_name);
        setInteractionOpen(true);
        break;
      case 'add-followup':
        if (!hasAccess) return;
        setActionContactId(row.id);
        setActionContactName(row.full_name);
        setFollowupOpen(true);
        break;
      case 'archive':
        handleArchive(row.id, row.full_name);
        break;
      case 'delete':
        setDeleteContact(contact);
        setDeleteDialogOpen(true);
        break;
    }
  }, [handleArchive, crmUserId, isAdmin]);

  // ── Inline assignment handlers ────────────────────────────────
  const handleInlineAssign = useCallback(async (contactId: string, userId: string, role: 'PRIMARY' | 'SECONDARY') => {
    const now = new Date().toISOString();

    // Safe duplicate check: see if this user already has an active assignment for this contact
    const { data: existing } = await supabase
      .from('contact_assignments')
      .select('id, assignment_role')
      .eq('contact_id', contactId)
      .eq('assigned_to_crm_user_id', userId)
      .eq('status', 'ACTIVE')
      .is('ended_at', null)
      .maybeSingle();

    if (existing && existing.assignment_role === role) {
      toast({ title: `Already ${role === 'PRIMARY' ? 'Primary' : 'Secondary'} owner` });
      return;
    }

    // If user has a different active role, close it first to avoid unique constraint
    if (existing) {
      await supabase
        .from('contact_assignments')
        .update({ status: 'CLOSED', ended_at: now })
        .eq('id', existing.id);
    }

    const { data: { user } } = await supabase.auth.getUser();
    let assignedByCrmUserId: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from('crm_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      assignedByCrmUserId = profile?.id || null;
    }

    // Close existing active assignment of same role for this contact
    await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED', ended_at: now })
      .eq('contact_id', contactId)
      .eq('status', 'ACTIVE')
      .is('ended_at', null)
      .eq('assignment_role', role);

    // Check if a CLOSED row exists for this contact+user pair (reactivate instead of inserting)
    const { data: closedRow } = await supabase
      .from('contact_assignments')
      .select('id')
      .eq('contact_id', contactId)
      .eq('assigned_to_crm_user_id', userId)
      .eq('status', 'CLOSED')
      .limit(1)
      .maybeSingle();

    let err: any = null;
    if (closedRow) {
      // Reactivate existing closed row
      const { error: updateErr } = await supabase
        .from('contact_assignments')
        .update({
          assignment_role: role,
          status: 'ACTIVE',
          ended_at: null,
          ended_by_crm_user_id: null,
          assigned_at: now,
          assigned_by_crm_user_id: assignedByCrmUserId,
        })
        .eq('id', closedRow.id);
      err = updateErr;
    } else {
      // Insert new
      const { error: insertErr } = await supabase
        .from('contact_assignments')
        .insert({
          contact_id: contactId,
          assigned_to_crm_user_id: userId,
          assigned_by_crm_user_id: assignedByCrmUserId,
          assignment_role: role,
          stage: 'COLD_CALLING',
          status: 'ACTIVE',
        });
      err = insertErr;
    }

    if (err) {
      toast({ title: 'Assignment failed', description: err.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${role === 'PRIMARY' ? 'Primary' : 'Secondary'} owner assigned` });
    await refetchAll();
  }, [toast, refetchAll]);

  const handleInlineRemove = useCallback(async (contactId: string, role: 'PRIMARY' | 'SECONDARY') => {
    const now = new Date().toISOString();
    const { error: err } = await supabase
      .from('contact_assignments')
      .update({ status: 'CLOSED', ended_at: now })
      .eq('contact_id', contactId)
      .eq('status', 'ACTIVE')
      .is('ended_at', null)
      .eq('assignment_role', role);

    if (err) {
      toast({ title: 'Remove failed', description: err.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${role === 'PRIMARY' ? 'Primary' : 'Secondary'} owner removed` });
    await refetchAll();
  }, [toast, refetchAll]);

  // ── Row click handler (Directory: admin only) ──────────────────
  const handleRowClick = useCallback((row: ContactV2Row) => {
    // Non-admin cannot open side panel from Directory
    if (activeTab === 'directory' && !isAdmin) return;
    const hasAccess = canAccessContact(row, crmUserId, isAdmin);
    setDrawerContact(rowToContactWithCompany(row));
    setDrawerStage(row.stage);
    setDrawerRestricted(!hasAccess);
    setDrawerOpen(true);
  }, [crmUserId, isAdmin, activeTab]);

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

  // ── Bulk action complete ──────────────────────────────────────
  const handleBulkComplete = useCallback(() => {
    setSelectedIds([]);
    refetchAll();
  }, [refetchAll]);

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
          <p className="mt-1 text-muted-foreground">
            {isAdmin ? 'Manage contact assignments and ownership' : 'Browse and manage your contacts'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/contacts/bulk-import">
              <FileUp className="mr-2 h-4 w-4" />
              Bulk Import
            </Link>
          </Button>
          <AddContactModal onSuccess={refetchAll} />
        </div>
      </div>

      {/* Tabs with counts + Unassigned pill */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={(v) => changeTab(v as TabKey)} className="flex-shrink-0">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground">
            {TAB_META.map((t) => {
              const countMap: Record<TabKey, number> = {
                directory: cumulative.directoryTotal,
                'my-primary': cumulative.primaryTotal,
                'my-secondary': cumulative.secondaryTotal,
                'my-added': cumulative.myAddedTotal,
              };
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                  <span className="ml-1 tabular-nums text-xs opacity-70">({countMap[t.value]})</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Unassigned pill */}
        <button
          onClick={() => {
            if (activeTab !== 'directory') changeTab('directory');
            setOwnerFilter({ userId: null, role: null, unassigned: true });
          }}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer
            ${ownerFilter.unassigned
              ? 'border-destructive bg-destructive/10 text-destructive'
              : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
        >
          Unassigned <span className="font-semibold tabular-nums">{cumulative.unassignedTotal}</span>
        </button>
      </div>

      {/* Stage chips + search (between tabs and owner summary) */}
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

      {/* Owner Summary Table (Directory only) */}
      {isDirectory && (
        <OwnerSummaryBlock
          visible
          directoryTotal={cumulative.directoryTotal}
          activeOwnerFilter={ownerFilter}
          onOwnerFilter={setOwnerFilter}
        />
      )}

      {/* Bulk toolbar */}
      {selectedIds.length > 0 && (
        <DirectoryBulkToolbar
          selectedIds={selectedIds}
          onClearSelection={() => setSelectedIds([])}
          onComplete={handleBulkComplete}
        />
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* A-Z Filter + Top Pagination (Directory only) */}
      {isDirectory && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <AlphaFilterBar active={alphaFilter} onChange={setAlphaFilter} />
          {!isLoading && totalPages > 1 && (
            <PaginationBar page={page} totalPages={totalPages} totalRows={totalRows} onPageChange={changePage} compact />
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <ContactsV2Table
          rows={rows}
          activeTab={activeTab}
          isAdmin={isAdmin}
          crmUserId={crmUserId}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
          allSelected={allSelected}
          onRowClick={handleRowClick}
          onRowAction={handleRowAction}
          onInlineAssign={handleInlineAssign}
          onInlineRemove={handleInlineRemove}
        />
      )}

      {/* Bottom Pagination */}
      {!isLoading && (
        <PaginationBar page={page} totalPages={totalPages} totalRows={totalRows} onPageChange={changePage} />
      )}

      {/* ── Modals ─────────────────────────────────────────────── */}

      {/* Contact Details Drawer */}
      {drawerRestricted ? (
        <ContactDetailsDrawer
          contact={drawerContact ? { ...drawerContact, email: null, phone: null, country_code: null } : null}
          companyName={drawerContact?.company_name ?? null}
          currentStage={drawerStage}
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setDrawerContact(null);
            setDrawerRestricted(false);
          }}
        />
      ) : (
        <ContactDetailsDrawer
          contact={drawerContact}
          companyName={drawerContact?.company_name ?? null}
          currentStage={drawerStage}
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setDrawerContact(null);
            setDrawerRestricted(false);
          }}
          onOwnersChange={refetchAll}
        />
      )}

      {/* Assign Contact Modal */}
      <AssignContactModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        contactId={actionContactId}
        contactName={actionContactName}
        defaultRole={assignRole}
        onSuccess={() => {
          setAssignModalOpen(false);
          refetchAll();
        }}
      />

      {/* Log Interaction Dialog */}
      <LogInteractionDialog
        open={interactionOpen}
        onOpenChange={setInteractionOpen}
        contactId={actionContactId}
        contactName={actionContactName}
        onSuccess={() => {
          setInteractionOpen(false);
          refetchAll();
        }}
      />

      {/* Add Follow-up Modal */}
      <AddFollowupModal
        isOpen={followupOpen}
        onClose={() => setFollowupOpen(false)}
        contactId={actionContactId}
        contactName={actionContactName}
        onSuccess={() => {
          setFollowupOpen(false);
          refetchAll();
        }}
      />

      {/* Edit Contact Modal */}
      {editContact && (
        <EditContactModal
          contact={editContact}
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) setEditContact(null);
          }}
          onSuccess={() => {
            setEditModalOpen(false);
            setEditContact(null);
            refetchAll();
          }}
        />
      )}

      {/* Delete Contact Dialog */}
      <DeleteContactDialog
        contact={deleteContact}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteContact(null);
        }}
        onSuccess={() => {
          setDeleteDialogOpen(false);
          setDeleteContact(null);
          refetchAll();
        }}
      />
    </div>
  );
}
