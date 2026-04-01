import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ColumnFilters {
  fullName: string;
  company: string;
  designation: string;
  email: string;
  phone: string;
  secondaryOwner: string;
  stage: string;
  status: string;
}

export const EMPTY_FILTERS: ColumnFilters = {
  fullName: '',
  company: '',
  designation: '',
  email: '',
  phone: '',
  secondaryOwner: '',
  stage: 'all',
  status: 'all',
};

export type SortDirection = 'asc' | 'desc';
export type SortColumn = 'full_name' | 'company' | 'designation' | 'email' | 'created_at' | 'stage';

const STAGE_OPTIONS = [
  { value: 'all', label: 'All Stages' },
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'TARGETING', label: 'Targeting' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

interface ColumnFiltersBarProps {
  filters: ColumnFilters;
  onFiltersChange: (filters: ColumnFilters) => void;
  showStage?: boolean;
  showStatus?: boolean;
  showSecondaryOwner?: boolean;
}

export function ColumnFiltersBar({
  filters,
  onFiltersChange,
  showStage = true,
  showStatus = true,
  showSecondaryOwner = true,
}: ColumnFiltersBarProps) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters =
    filters.fullName.trim() !== '' ||
    filters.company.trim() !== '' ||
    filters.designation.trim() !== '' ||
    filters.email.trim() !== '' ||
    filters.phone.trim() !== '' ||
    filters.secondaryOwner.trim() !== '' ||
    filters.stage !== 'all' ||
    filters.status !== 'all';

  const activeCount = [
    filters.fullName.trim(),
    filters.company.trim(),
    filters.designation.trim(),
    filters.email.trim(),
    filters.phone.trim(),
    filters.secondaryOwner.trim(),
    filters.stage !== 'all' ? 'y' : '',
    filters.status !== 'all' ? 'y' : '',
  ].filter(Boolean).length;

  return (
    <div className="space-y-2 mb-3">
      {/* Row 1: Main search fields */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[150px] max-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Name"
            value={filters.fullName}
            onChange={(e) => onFiltersChange({ ...filters, fullName: e.target.value })}
            className="pl-7 h-8 text-xs"
          />
        </div>
        <div className="relative flex-1 min-w-[150px] max-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Company"
            value={filters.company}
            onChange={(e) => onFiltersChange({ ...filters, company: e.target.value })}
            className="pl-7 h-8 text-xs"
          />
        </div>
        <div className="relative flex-1 min-w-[130px] max-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Email"
            value={filters.email}
            onChange={(e) => onFiltersChange({ ...filters, email: e.target.value })}
            className="pl-7 h-8 text-xs"
          />
        </div>
        {showStage && (
          <Select value={filters.stage} onValueChange={(v) => onFiltersChange({ ...filters, stage: v })}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {showStatus && (
          <Select value={filters.status} onValueChange={(v) => onFiltersChange({ ...filters, status: v })}>
            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button
          variant={expanded ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 text-xs gap-1"
          onClick={() => setExpanded((p) => !p)}
        >
          <Filter className="h-3 w-3" />
          {activeCount > 3 ? `More (${activeCount - 3})` : 'More'}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onFiltersChange({ ...EMPTY_FILTERS })}>
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Row 2: Expanded filters */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 pl-0.5">
          <div className="relative flex-1 min-w-[130px] max-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Designation"
              value={filters.designation}
              onChange={(e) => onFiltersChange({ ...filters, designation: e.target.value })}
              className="pl-7 h-8 text-xs"
            />
          </div>
          <div className="relative flex-1 min-w-[130px] max-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Phone"
              value={filters.phone}
              onChange={(e) => onFiltersChange({ ...filters, phone: e.target.value })}
              className="pl-7 h-8 text-xs"
            />
          </div>
          {showSecondaryOwner && (
            <div className="relative flex-1 min-w-[130px] max-w-[180px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Secondary Owner"
                value={filters.secondaryOwner}
                onChange={(e) => onFiltersChange({ ...filters, secondaryOwner: e.target.value })}
                className="pl-7 h-8 text-xs"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  column: SortColumn;
  currentSort: { column: SortColumn; direction: SortDirection };
  onSort: (column: SortColumn) => void;
  className?: string;
}

export function SortableHeader({ label, column, currentSort, onSort, className }: SortableHeaderProps) {
  const isActive = currentSort.column === column;
  return (
    <button
      className={`flex items-center gap-1 hover:text-foreground transition-colors ${className || ''}`}
      onClick={() => onSort(column)}
    >
      {label}
      {isActive ? (
        currentSort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

export interface ColumnFilterGetters<T> {
  fullName: (item: T) => string;
  company: (item: T) => string;
  designation: (item: T) => string;
  email: (item: T) => string;
  phone: (item: T) => string;
  secondaryOwner: (item: T) => string;
  stage: (item: T) => string;
  isActive: (item: T) => boolean;
}

export function useColumnFilters<T>(
  data: T[],
  filters: ColumnFilters,
  getters: ColumnFilterGetters<T>
) {
  return useMemo(() => {
    let filtered = data;

    if (filters.fullName.trim()) {
      const s = filters.fullName.toLowerCase().trim();
      filtered = filtered.filter(item => getters.fullName(item).toLowerCase().includes(s));
    }
    if (filters.company.trim()) {
      const s = filters.company.toLowerCase().trim();
      filtered = filtered.filter(item => getters.company(item).toLowerCase().includes(s));
    }
    if (filters.designation.trim()) {
      const s = filters.designation.toLowerCase().trim();
      filtered = filtered.filter(item => getters.designation(item).toLowerCase().includes(s));
    }
    if (filters.email.trim()) {
      const s = filters.email.toLowerCase().trim();
      filtered = filtered.filter(item => getters.email(item).toLowerCase().includes(s));
    }
    if (filters.phone.trim()) {
      const s = filters.phone.toLowerCase().trim();
      filtered = filtered.filter(item => getters.phone(item).toLowerCase().includes(s));
    }
    if (filters.secondaryOwner.trim()) {
      const s = filters.secondaryOwner.toLowerCase().trim();
      filtered = filtered.filter(item => getters.secondaryOwner(item).toLowerCase().includes(s));
    }
    if (filters.stage !== 'all') {
      filtered = filtered.filter(item => getters.stage(item) === filters.stage);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter(item =>
        filters.status === 'active' ? getters.isActive(item) : !getters.isActive(item)
      );
    }

    return filtered;
  }, [data, filters, getters]);
}
