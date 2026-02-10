import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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

  const formatCountryChips = (countries: Record<string, number>) => {
    return Object.entries(countries)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => (
        <Badge key={c} variant="outline" className="text-[10px] px-1.5 py-0 mr-1 mb-0.5 font-normal border-gray-300">
          {c}: {n}
        </Badge>
      ));
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white mb-4">
      <div className="px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-foreground">Assignment Summary</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200">
              <TableHead className="text-xs">User Name</TableHead>
              <TableHead className="text-xs text-center">Total Contacts</TableHead>
              <TableHead className="text-xs text-center">Primary Count</TableHead>
              <TableHead className="text-xs text-center">Secondary Count</TableHead>
              <TableHead className="text-xs">Country Breakdown</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.map((s, idx) => (
              <TableRow key={s.userId} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                <TableCell className="text-sm font-medium py-1.5">{s.name}</TableCell>
                <TableCell className="text-center py-1.5">
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 text-xs font-semibold">
                    {s.total}
                  </Badge>
                </TableCell>
                <TableCell className="text-center py-1.5">
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 text-xs font-semibold">
                    {s.primaryCount}
                  </Badge>
                </TableCell>
                <TableCell className="text-center py-1.5">
                  <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0 text-xs font-semibold">
                    {s.secondaryCount}
                  </Badge>
                </TableCell>
                <TableCell className="py-1.5 max-w-[350px]">
                  <div className="flex flex-wrap">
                    {formatCountryChips(s.countries)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
