import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface ColumnFilters {
  fullName: string;
  company: string;
  designation: string;
  email: string;
}

export type SortDirection = 'asc' | 'desc';
export type SortColumn = 'full_name' | 'company' | 'designation' | 'email' | 'created_at' | 'stage';

interface ColumnFiltersBarProps {
  filters: ColumnFilters;
  onFiltersChange: (filters: ColumnFilters) => void;
}

export function ColumnFiltersBar({ filters, onFiltersChange }: ColumnFiltersBarProps) {
  const hasActiveFilters = Object.values(filters).some(v => v.trim() !== '');

  return (
    <div className="flex flex-wrap items-end gap-2 mb-3">
      <div className="relative flex-1 min-w-[140px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Full Name"
          value={filters.fullName}
          onChange={(e) => onFiltersChange({ ...filters, fullName: e.target.value })}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <div className="relative flex-1 min-w-[140px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Company"
          value={filters.company}
          onChange={(e) => onFiltersChange({ ...filters, company: e.target.value })}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <div className="relative flex-1 min-w-[140px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Designation"
          value={filters.designation}
          onChange={(e) => onFiltersChange({ ...filters, designation: e.target.value })}
          className="pl-8 h-8 text-sm"
        />
      </div>
      <div className="relative flex-1 min-w-[140px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Email"
          value={filters.email}
          onChange={(e) => onFiltersChange({ ...filters, email: e.target.value })}
          className="pl-8 h-8 text-sm"
        />
      </div>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={() => onFiltersChange({ fullName: '', company: '', designation: '', email: '' })}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Clear
        </Button>
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
        currentSort.direction === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

export function useColumnFilters<T>(
  data: T[],
  filters: ColumnFilters,
  getters: {
    fullName: (item: T) => string;
    company: (item: T) => string;
    designation: (item: T) => string;
    email: (item: T) => string;
  }
) {
  return useMemo(() => {
    let filtered = data;

    if (filters.fullName.trim()) {
      const search = filters.fullName.toLowerCase().trim();
      filtered = filtered.filter(item => getters.fullName(item).toLowerCase().includes(search));
    }
    if (filters.company.trim()) {
      const search = filters.company.toLowerCase().trim();
      filtered = filtered.filter(item => getters.company(item).toLowerCase().includes(search));
    }
    if (filters.designation.trim()) {
      const search = filters.designation.toLowerCase().trim();
      filtered = filtered.filter(item => getters.designation(item).toLowerCase().includes(search));
    }
    if (filters.email.trim()) {
      const search = filters.email.toLowerCase().trim();
      filtered = filtered.filter(item => getters.email(item).toLowerCase().includes(search));
    }

    return filtered;
  }, [data, filters, getters]);
}
