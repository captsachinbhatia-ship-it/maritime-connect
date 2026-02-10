import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ContactOwners } from '@/services/assignments';

interface DirectorySummaryTableProps {
  ownersMap: Record<string, ContactOwners>;
  ownerNamesMap: Record<string, string>;
  contactCountryMap: Record<string, string | null>;
}

interface UserSummary {
  userId: string;
  name: string;
  total: number;
  primaryCount: number;
  secondaryCount: number;
  countries: Record<string, number>;
}

export function DirectorySummaryTable({
  ownersMap,
  ownerNamesMap,
  contactCountryMap,
}: DirectorySummaryTableProps) {
  const summaries = useMemo(() => {
    const map: Record<string, UserSummary> = {};

    const ensure = (uid: string) => {
      if (!map[uid]) {
        map[uid] = {
          userId: uid,
          name: ownerNamesMap[uid] || 'Unknown',
          total: 0,
          primaryCount: 0,
          secondaryCount: 0,
          countries: {},
        };
      }
    };

    Object.entries(ownersMap).forEach(([contactId, owners]) => {
      const country = contactCountryMap[contactId] || 'Other';
      const pId = owners.primary?.assigned_to_crm_user_id;
      const sId = owners.secondary?.assigned_to_crm_user_id;

      if (pId) {
        ensure(pId);
        map[pId].primaryCount++;
        map[pId].total++;
        map[pId].countries[country] = (map[pId].countries[country] || 0) + 1;
      }
      if (sId) {
        ensure(sId);
        map[sId].secondaryCount++;
        map[sId].total++;
        map[sId].countries[country] = (map[sId].countries[country] || 0) + 1;
      }
    });

    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [ownersMap, ownerNamesMap, contactCountryMap]);

  if (summaries.length === 0) return null;

  const formatCountries = (countries: Record<string, number>) => {
    const sorted = Object.entries(countries).sort((a, b) => b[1] - a[1]);
    return sorted.map(([c, n]) => `${c}(${n})`).join(', ');
  };

  return (
    <div className="rounded-lg border bg-card mb-4">
      <div className="px-4 py-2 border-b">
        <h3 className="text-sm font-semibold text-foreground">Assignment Summary</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs text-center">Total</TableHead>
              <TableHead className="text-xs text-center">Primary</TableHead>
              <TableHead className="text-xs text-center">Secondary</TableHead>
              <TableHead className="text-xs">Country Breakdown</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((s) => (
              <TableRow key={s.userId}>
                <TableCell className="text-sm font-medium py-1.5">{s.name}</TableCell>
                <TableCell className="text-sm text-center py-1.5">{s.total}</TableCell>
                <TableCell className="text-sm text-center py-1.5">{s.primaryCount}</TableCell>
                <TableCell className="text-sm text-center py-1.5">{s.secondaryCount}</TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5 max-w-[300px] truncate">
                  {formatCountries(s.countries)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
