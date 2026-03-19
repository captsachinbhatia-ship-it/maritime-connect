import { useState, useEffect, useMemo } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { getUserNames } from '@/services/interactions';
import { Navigate } from 'react-router-dom';

type AssignmentStage = 'COLD_CALLING' | 'TARGETING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

const STAGE_LABELS: Record<AssignmentStage, string> = {
  COLD_CALLING: 'Cold Calling',
  TARGETING: 'Targeting',
  ASPIRATION: 'Aspiration',
  ACHIEVEMENT: 'Achievement',
  INACTIVE: 'Inactive',
};

const STAGE_COLORS: Record<AssignmentStage, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800',
  TARGETING: 'bg-orange-100 text-orange-800',
  ASPIRATION: 'bg-amber-100 text-amber-800',
  ACHIEVEMENT: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

interface OwnerSummaryRow {
  user_id: string | null;
  primary_count: number;
  secondary_count: number;
  total: number;
}

interface GlobalStageBreakdown {
  stage: AssignmentStage;
  primary_count: number;
  secondary_count: number;
}

export default function AdminSummary() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [ownerRows, setOwnerRows] = useState<OwnerSummaryRow[]>([]);
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
  const [globalStages, setGlobalStages] = useState<GlobalStageBreakdown[]>([]);
  const [globalTotals, setGlobalTotals] = useState({ total: 0, assigned: 0, unassigned: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const load = async () => {
      setIsLoading(true);
      try {
        // Fetch owner summary
        const { data: ownerData } = await supabase.from('v_owner_summary').select('*');
        const rows = (ownerData || []) as OwnerSummaryRow[];
        setOwnerRows(rows);

        // Resolve user names
        const userIds = rows.map(r => r.user_id).filter((id): id is string => !!id);
        if (userIds.length > 0) {
          const namesResult = await getUserNames(userIds);
          if (namesResult.data) setUserNamesMap(namesResult.data);
        }

        // Fetch global stage breakdown from v_directory_contacts
        const { data: directoryData } = await supabase
          .from('v_directory_contacts')
          .select('primary_owner_id, primary_stage, secondary_owner_id');

        if (directoryData) {
          let total = 0;
          let assigned = 0;
          let unassigned = 0;
          const stageMap: Record<string, { primary: number; secondary: number }> = {
            COLD_CALLING: { primary: 0, secondary: 0 },
            ASPIRATION: { primary: 0, secondary: 0 },
            ACHIEVEMENT: { primary: 0, secondary: 0 },
            INACTIVE: { primary: 0, secondary: 0 },
          };

          directoryData.forEach((r: any) => {
            total++;
            if (!r.primary_owner_id) {
              unassigned++;
            } else {
              assigned++;
            }

            const stage = (r.primary_stage ?? '').trim().toUpperCase();
            if (stage in stageMap) {
              stageMap[stage].primary++;
              if (r.secondary_owner_id) {
                stageMap[stage].secondary++;
              }
            }
          });

          setGlobalTotals({ total, assigned, unassigned });
          setGlobalStages(
            (['COLD_CALLING', 'TARGETING', 'ASPIRATION', 'ACHIEVEMENT', 'INACTIVE'] as AssignmentStage[]).map(s => ({
              stage: s,
              primary_count: stageMap[s].primary,
              secondary_count: stageMap[s].secondary,
            }))
          );
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [authLoading, isAdmin]);

  const { userRows, unassignedRow } = useMemo(() => {
    let unassigned: OwnerSummaryRow | null = null;
    const users: (OwnerSummaryRow & { name: string })[] = [];

    ownerRows.forEach(r => {
      if (!r.user_id) {
        unassigned = r;
      } else {
        users.push({ ...r, name: userNamesMap[r.user_id] || 'Unknown' });
      }
    });

    users.sort((a, b) => a.name.localeCompare(b.name));
    return { userRows: users, unassignedRow: unassigned as OwnerSummaryRow | null };
  }, [ownerRows, userNamesMap]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Summary</h1>
          <p className="mt-1 text-muted-foreground">Global contact assignment overview</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Summary</h1>
          <p className="mt-1 text-muted-foreground">Global contact assignment overview</p>
        </div>
      </div>

      {/* Global Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{globalTotals.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-green-600">{globalTotals.assigned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-destructive">{globalTotals.unassigned}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stage Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead className="text-center w-[120px]">Primary Assignments</TableHead>
                <TableHead className="text-center w-[120px]">With Secondary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {globalStages.map(row => (
                <TableRow key={row.stage}>
                  <TableCell>
                    <Badge className={STAGE_COLORS[row.stage]}>{STAGE_LABELS[row.stage]}</Badge>
                  </TableCell>
                  <TableCell className="text-center tabular-nums font-medium">{row.primary_count}</TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">{row.secondary_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-User Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Per-User Totals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead className="text-center w-[100px]">Primary</TableHead>
                <TableHead className="text-center w-[100px]">Secondary</TableHead>
                <TableHead className="text-center w-[80px]">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unassignedRow && (
                <TableRow>
                  <TableCell className="font-medium text-destructive">⚠ Unassigned</TableCell>
                  <TableCell className="text-center tabular-nums font-medium">{unassignedRow.primary_count}</TableCell>
                  <TableCell className="text-center text-muted-foreground">—</TableCell>
                  <TableCell className="text-center tabular-nums font-semibold">{unassignedRow.primary_count}</TableCell>
                </TableRow>
              )}
              {userRows.map(row => (
                <TableRow key={row.user_id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-center tabular-nums">{row.primary_count}</TableCell>
                  <TableCell className="text-center tabular-nums">{row.secondary_count}</TableCell>
                  <TableCell className="text-center tabular-nums font-semibold">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
