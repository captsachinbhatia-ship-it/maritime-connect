import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ContactOwners } from '@/services/assignments';

export interface UserFilter {
  crmUserId: string;
  role: 'PRIMARY' | 'SECONDARY';
}

interface DirectoryUserChipsProps {
  ownersMap: Record<string, ContactOwners>;
  ownerNamesMap: Record<string, string>;
  selectedFilter: UserFilter | null;
  onFilterChange: (filter: UserFilter | null) => void;
}

interface UserCount {
  userId: string;
  name: string;
  primaryCount: number;
  secondaryCount: number;
}

export function DirectoryUserChips({
  ownersMap,
  ownerNamesMap,
  selectedFilter,
  onFilterChange,
}: DirectoryUserChipsProps) {
  const userCounts = useMemo(() => {
    const counts: Record<string, { primaryCount: number; secondaryCount: number }> = {};

    Object.values(ownersMap).forEach((owners) => {
      const pId = owners.primary?.assigned_to_crm_user_id;
      const sId = owners.secondary?.assigned_to_crm_user_id;
      if (pId) {
        if (!counts[pId]) counts[pId] = { primaryCount: 0, secondaryCount: 0 };
        counts[pId].primaryCount++;
      }
      if (sId) {
        if (!counts[sId]) counts[sId] = { primaryCount: 0, secondaryCount: 0 };
        counts[sId].secondaryCount++;
      }
    });

    const result: UserCount[] = Object.entries(counts).map(([userId, c]) => ({
      userId,
      name: ownerNamesMap[userId] || 'Unknown',
      primaryCount: c.primaryCount,
      secondaryCount: c.secondaryCount,
    }));

    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [ownersMap, ownerNamesMap]);

  if (userCounts.length === 0) return null;

  const isActive = (userId: string, role: 'PRIMARY' | 'SECONDARY') =>
    selectedFilter?.crmUserId === userId && selectedFilter?.role === role;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <span className="text-xs font-medium text-muted-foreground mr-1">Filter by owner:</span>
      {userCounts.map((u) => (
        <div key={u.userId} className="flex items-center gap-0.5">
          <Badge
            variant={isActive(u.userId, 'PRIMARY') ? 'default' : 'outline'}
            className="cursor-pointer text-xs px-2 py-0.5 hover:bg-primary/10 transition-colors"
            onClick={() =>
              isActive(u.userId, 'PRIMARY')
                ? onFilterChange(null)
                : onFilterChange({ crmUserId: u.userId, role: 'PRIMARY' })
            }
          >
            P: {u.name} ({u.primaryCount})
          </Badge>
          {u.secondaryCount > 0 && (
            <Badge
              variant={isActive(u.userId, 'SECONDARY') ? 'default' : 'outline'}
              className="cursor-pointer text-xs px-2 py-0.5 hover:bg-accent/50 transition-colors"
              onClick={() =>
                isActive(u.userId, 'SECONDARY')
                  ? onFilterChange(null)
                  : onFilterChange({ crmUserId: u.userId, role: 'SECONDARY' })
              }
            >
              S: {u.secondaryCount}
            </Badge>
          )}
        </div>
      ))}
      {selectedFilter && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={() => onFilterChange(null)}
        >
          <X className="h-3 w-3 mr-1" />
          Reset
        </Button>
      )}
    </div>
  );
}
