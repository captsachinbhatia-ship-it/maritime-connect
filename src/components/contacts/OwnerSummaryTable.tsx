import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw } from 'lucide-react';
import { DirectoryRow } from '@/types/directory';

export interface OwnerFilterState {
  type: 'primary' | 'secondary' | 'unassigned';
  userId?: string;
}

interface UserRow {
  userId: string;
  name: string;
  primaryCount: number;
  secondaryCount: number;
  total: number;
}

interface OwnerSummaryTableProps {
  contacts: DirectoryRow[];
  userNamesMap: Record<string, string>;
  activeFilter: OwnerFilterState | null;
  onFilterChange: (filter: OwnerFilterState | null) => void;
}

export function OwnerSummaryTable({
  contacts,
  userNamesMap,
  activeFilter,
  onFilterChange,
}: OwnerSummaryTableProps) {
  const { userRows, unassignedCount } = useMemo(() => {
    const primaryCounts: Record<string, number> = {};
    const secondaryCounts: Record<string, number> = {};
    let unassigned = 0;

    contacts.forEach((c) => {
      if (c.is_unassigned || !c.primary_owner_id) {
        unassigned++;
      } else {
        primaryCounts[c.primary_owner_id] = (primaryCounts[c.primary_owner_id] || 0) + 1;
      }
      if (c.secondary_owner_id) {
        secondaryCounts[c.secondary_owner_id] = (secondaryCounts[c.secondary_owner_id] || 0) + 1;
      }
    });

    // Merge all user IDs
    const allIds = new Set([...Object.keys(primaryCounts), ...Object.keys(secondaryCounts)]);
    const rows: UserRow[] = Array.from(allIds).map((userId) => ({
      userId,
      name: userNamesMap[userId] || 'Unknown',
      primaryCount: primaryCounts[userId] || 0,
      secondaryCount: secondaryCounts[userId] || 0,
      total: (primaryCounts[userId] || 0) + (secondaryCounts[userId] || 0),
    }));

    rows.sort((a, b) => a.name.localeCompare(b.name));
    return { userRows: rows, unassignedCount: unassigned };
  }, [contacts, userNamesMap]);

  const isActive = (type: OwnerFilterState['type'], userId?: string) => {
    if (!activeFilter) return false;
    if (activeFilter.type !== type) return false;
    if (type === 'unassigned') return true;
    return activeFilter.userId === userId;
  };

  const cellButton = (
    count: number,
    type: 'primary' | 'secondary' | 'unassigned',
    userId?: string
  ) => {
    const active = isActive(type, userId);
    if (count === 0 && type !== 'unassigned') {
      return <span className="text-muted-foreground/40 tabular-nums">0</span>;
    }
    return (
      <button
        onClick={() =>
          active
            ? onFilterChange(null)
            : onFilterChange({ type, userId })
        }
        className={`tabular-nums text-sm font-medium px-2 py-0.5 rounded transition-colors ${
          active
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted cursor-pointer'
        }`}
      >
        {count}
      </button>
    );
  };

  if (userRows.length === 0 && unassignedCount === 0) return null;

  return (
    <Card className="mb-4">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Owner Summary
          </span>
          {activeFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onFilterChange(null)}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs py-1.5 h-auto">Owner</TableHead>
              <TableHead className="text-xs py-1.5 h-auto text-center w-[80px]">Primary</TableHead>
              <TableHead className="text-xs py-1.5 h-auto text-center w-[80px]">Secondary</TableHead>
              <TableHead className="text-xs py-1.5 h-auto text-center w-[70px]">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Unassigned row */}
            <TableRow className={`hover:bg-muted/50 ${isActive('unassigned') ? 'bg-primary/5' : ''}`}>
              <TableCell className="py-1.5 text-sm font-medium text-destructive">
                ⚠ Unassigned
              </TableCell>
              <TableCell className="py-1.5 text-center">
                {cellButton(unassignedCount, 'unassigned')}
              </TableCell>
              <TableCell className="py-1.5 text-center">
                <span className="text-muted-foreground/40">—</span>
              </TableCell>
              <TableCell className="py-1.5 text-center font-semibold tabular-nums text-sm">
                {unassignedCount}
              </TableCell>
            </TableRow>
            {/* User rows */}
            {userRows.map((row) => (
              <TableRow
                key={row.userId}
                className={`hover:bg-muted/50 ${
                  isActive('primary', row.userId) || isActive('secondary', row.userId)
                    ? 'bg-primary/5'
                    : ''
                }`}
              >
                <TableCell className="py-1.5 text-sm">{row.name}</TableCell>
                <TableCell className="py-1.5 text-center">
                  {cellButton(row.primaryCount, 'primary', row.userId)}
                </TableCell>
                <TableCell className="py-1.5 text-center">
                  {cellButton(row.secondaryCount, 'secondary', row.userId)}
                </TableCell>
                <TableCell className="py-1.5 text-center font-semibold tabular-nums text-sm">
                  {row.total}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
