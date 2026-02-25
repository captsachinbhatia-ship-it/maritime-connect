import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getUserNames } from "@/services/interactions";

export interface OwnerFilterState {
  type: "primary" | "secondary" | "unassigned";
  userId?: string;
}

interface SummaryRow {
  user_id: string | null;
  primary_count: number;
  secondary_count: number;
  total: number;
}

interface OwnerSummaryTableProps {
  activeFilter: OwnerFilterState | null;
  onFilterChange: (filter: OwnerFilterState | null) => void;
}

export function OwnerSummaryTable({ activeFilter, onFilterChange }: OwnerSummaryTableProps) {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [countRes, unassignedRes] = await Promise.all([
          supabase.from("v_owner_contact_counts").select("*"),
          supabase.from("v_unassigned_active_contacts").select("id", { count: "exact", head: true }),
        ]);

        if (countRes.error || !countRes.data) {
          setRows([]);
          setIsLoading(false);
          return;
        }

        // Build summary rows from v_owner_contact_counts
        const userMap: Record<string, SummaryRow> = {};
        (countRes.data as any[]).forEach((r: any) => {
          const uid = r.owner_crm_user_id as string | null;
          if (!uid) return;
          if (!userMap[uid]) {
            userMap[uid] = { user_id: uid, primary_count: 0, secondary_count: 0, total: 0 };
          }
          const count = Number(r.contact_count ?? 0);
          const role = (r.assignment_role ?? "").toUpperCase();
          if (role === "PRIMARY") {
            userMap[uid].primary_count = count;
          } else if (role === "SECONDARY") {
            userMap[uid].secondary_count = count;
          }
          userMap[uid].total = userMap[uid].primary_count + userMap[uid].secondary_count;
        });

        const dbUnassigned = unassignedRes.count ?? 0;
        const filtered = Object.values(userMap);
        filtered.push({ user_id: null, primary_count: 0, secondary_count: 0, total: dbUnassigned });

        setRows(filtered);

        // Resolve user names
        const userIds = filtered.map((r) => r.user_id).filter((id): id is string => !!id);
        if (userIds.length > 0) {
          const namesResult = await getUserNames(userIds);
          if (namesResult.data) setUserNamesMap(namesResult.data);
        }
      } catch {
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const { userRows, unassignedRow } = useMemo(() => {
    let unassigned: SummaryRow | null = null;
    const users: (SummaryRow & { name: string })[] = [];

    rows.forEach((r) => {
      if (!r.user_id) {
        unassigned = r;
      } else {
        users.push({ ...r, name: userNamesMap[r.user_id] || "Unknown" });
      }
    });

    users.sort((a, b) => a.name.localeCompare(b.name));
    return { userRows: users, unassignedRow: unassigned as SummaryRow | null };
  }, [rows, userNamesMap]);

  const isActive = (type: OwnerFilterState["type"], userId?: string) => {
    if (!activeFilter) return false;
    if (activeFilter.type !== type) return false;
    if (type === "unassigned") return true;
    return activeFilter.userId === userId;
  };

  const cellButton = (count: number, type: "primary" | "secondary" | "unassigned", userId?: string) => {
    const active = isActive(type, userId);
    if (count === 0 && type !== "unassigned") {
      return <span className="text-muted-foreground/40 tabular-nums">0</span>;
    }
    return (
      <button
        onClick={() => (active ? onFilterChange(null) : onFilterChange({ type, userId }))}
        className={`tabular-nums text-sm font-medium px-2 py-0.5 rounded transition-colors ${
          active ? "bg-primary text-primary-foreground" : "hover:bg-muted cursor-pointer"
        }`}
      >
        {count}
      </button>
    );
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-3">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (userRows.length === 0 && !unassignedRow) return null;

  const unassignedCount = unassignedRow?.total ?? 0;

  return (
    <Card className="mb-4">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner Summary</span>
          {activeFilter && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onFilterChange(null)}>
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
            <TableRow className={`hover:bg-muted/50 ${isActive("unassigned") ? "bg-primary/5" : ""}`}>
              <TableCell className="py-1.5 text-sm font-medium text-destructive">⚠ Unassigned</TableCell>
              <TableCell className="py-1.5 text-center">{cellButton(unassignedCount, "unassigned")}</TableCell>
              <TableCell className="py-1.5 text-center">
                <span className="text-muted-foreground/40">—</span>
              </TableCell>
              <TableCell className="py-1.5 text-center font-semibold tabular-nums text-sm">{unassignedCount}</TableCell>
            </TableRow>
            {/* User rows */}
            {userRows.map((row) => (
              <TableRow
                key={row.user_id}
                className={`hover:bg-muted/50 ${
                  isActive("primary", row.user_id!) || isActive("secondary", row.user_id!) ? "bg-primary/5" : ""
                }`}
              >
                <TableCell className="py-1.5 text-sm">{row.name}</TableCell>
                <TableCell className="py-1.5 text-center">
                  {cellButton(row.primary_count, "primary", row.user_id!)}
                </TableCell>
                <TableCell className="py-1.5 text-center">
                  {cellButton(row.secondary_count, "secondary", row.user_id!)}
                </TableCell>
                <TableCell className="py-1.5 text-center font-semibold tabular-nums text-sm">{row.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
