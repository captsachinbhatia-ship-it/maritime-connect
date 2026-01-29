import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface InteractionsFiltersState {
  type: string;
  outcome: string;
  dateRange: string;
  search: string;
}

interface InteractionsFiltersProps {
  filters: InteractionsFiltersState;
  onFiltersChange: (filters: InteractionsFiltersState) => void;
}

const INTERACTION_TYPES = ['CALL', 'EMAIL', 'MEETING', 'WHATSAPP', 'NOTE'] as const;

const OUTCOME_OPTIONS = [
  'NO_RESPONSE',
  'INTERESTED',
  'NOT_INTERESTED',
  'FOLLOW_UP',
  'MEETING_SCHEDULED',
  'DEAL_PROGRESS',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const;

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const;

export function InteractionsFilters({ filters, onFiltersChange }: InteractionsFiltersProps) {
  const updateFilter = (key: keyof InteractionsFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="space-y-2">
      {/* Row 1: Dropdowns */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.type}
          onValueChange={(value) => updateFilter('type', value)}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {INTERACTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.outcome}
          onValueChange={(value) => updateFilter('outcome', value)}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            {OUTCOME_OPTIONS.map((outcome) => (
              <SelectItem key={outcome} value={outcome}>
                {outcome.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.dateRange}
          onValueChange={(value) => updateFilter('dateRange', value)}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search subject or notes..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>
    </div>
  );
}
