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

interface DirectoryContact {
  id: string;
  full_name: string | null;
  company_id: string | null;
  [key: string]: any;
}

interface DirectorySummaryTableProps {
  ownersMap: Record<string, ContactOwners>;
  ownerNamesMap: Record<string, string>;
  contacts: DirectoryContact[];
}

interface UserSummary {
  userId: string;
  name: string;
  total: number;
  primaryCount: number;
  secondaryCount: number;
}

export function DirectorySummaryTable({
  ownersMap,
  ownerNamesMap,
  contacts,
}: DirectorySummaryTableProps) {
  // Count unassigned (contacts without a primary owner)
  const unassignedCount = useMemo(() => {
    return contacts.filter(c => {
      const owners = ownersMap[c.id];
      return !owners?.primary?.assigned_to_crm_user_id;
    }).length;
  }, [contacts, ownersMap]);

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
        };
      }
    };

    Object.entries(ownersMap).forEach(([, owners]) => {
      const pId = owners.primary?.assigned_to_crm_user_id;
      const sId = owners.secondary?.assigned_to_crm_user_id;

      if (pId) {
        ensure(pId);
        map[pId].primaryCount++;
        map[pId].total++;
      }
      if (sId) {
        ensure(sId);
        map[sId].secondaryCount++;
        map[sId].total++;
      }
    });

    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [ownersMap, ownerNamesMap]);

  if (summaries.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white mb-4">
      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Assignment Summary</h3>
        <Badge className={`text-xs font-semibold border-0 ${unassignedCount > 0 ? 'bg-red-100 text-red-800 hover:bg-red-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-100'}`}>
          {unassignedCount} unassigned
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200">
              <TableHead className="text-xs">User Name</TableHead>
              <TableHead className="text-xs text-center">Total Contacts</TableHead>
              <TableHead className="text-xs text-center">Primary Count</TableHead>
              <TableHead className="text-xs text-center">Secondary Count</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
