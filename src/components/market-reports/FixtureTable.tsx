import { useMemo, useState } from "react";
import { ArrowUpDown, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { MarketFixture, Resolution } from "@/services/marketData";
import type { VesselDiscrepancy } from "@/lib/discrepancies";
import { groupFixtures, type FixtureGroup } from "@/lib/fixtureGrouping";
import { GroupedFixtureRow } from "./GroupedFixtureRow";

const STATUS_COLORS: Record<string, string> = {
  fixed: "bg-green-100 text-green-800 border-green-300",
  on_subs: "bg-yellow-100 text-yellow-800 border-yellow-300",
  reported: "bg-blue-100 text-blue-800 border-blue-300",
  failed: "bg-red-100 text-red-800 border-red-300",
  withdrawn: "bg-gray-100 text-gray-600 border-gray-300",
};

const SOURCE_LABELS: Record<string, string> = {
  meiwa_vlcc: "Meiwa VLCC",
  meiwa_dirty: "Meiwa Dirty",
  presco: "Presco",
  gibson: "Gibson",
  vantage_dpp: "Vantage DPP",
  eastport: "Eastport",
  alliance: "Alliance",
  bravo_tankers: "Bravo",
  ssy: "SSY",
  aq_maritime: "AQ Maritime",
  aq_manual: "AQ Manual",
};

type SortCol =
  | "vessel_name"
  | "vessel_class"
  | "charterer"
  | "load_port"
  | "discharge_port"
  | "rate_numeric"
  | "fixture_status"
  | "report_source"
  | "report_date";

interface Props {
  fixtures: MarketFixture[];
  fixtureFieldMap: Map<string, Set<string>>;
  vesselDiscrepancies: Map<string, VesselDiscrepancy>;
  resolutions?: Resolution[];
  onResolve?: (disc: VesselDiscrepancy) => void;
  onResolveGroup?: (group: FixtureGroup) => void;
  onAutoResolveGroup?: (group: FixtureGroup) => void;
  onEdit?: (fixture: MarketFixture) => void;
}

export function FixtureTable({
  fixtures,
  fixtureFieldMap,
  vesselDiscrepancies,
  onResolve,
  onResolveGroup,
  onAutoResolveGroup,
  onEdit,
  resolutions = [],
}: Props) {
  const [sortCol, setSortCol] = useState<SortCol>("vessel_class");
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortAsc((p) => !p);
    else { setSortCol(col); setSortAsc(true); }
  };

  const sorted = useMemo(() => {
    const arr = [...fixtures];
    arr.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortCol];
      const bv = (b as unknown as Record<string, unknown>)[sortCol];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return sortAsc ? av - bv : bv - av;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [fixtures, sortCol, sortAsc]);

  const { singles, groups } = useMemo(
    () => groupFixtures(sorted, resolutions),
    [sorted, resolutions]
  );

  const totalUnresolved = groups.reduce((sum, g) => sum + g.unresolvedCount, 0);
  const colCount = onEdit ? 14 : 13;

  const SortHeader = ({ col, children, className }: { col: SortCol; children: React.ReactNode; className?: string }) => (
    <TableHead className={cn("cursor-pointer select-none whitespace-nowrap text-xs", className)} onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
      </span>
    </TableHead>
  );

  const formatLaycan = (from: string | null, to: string | null) => {
    if (!from) return "—";
    const f = new Date(from);
    const fStr = `${f.getDate()}/${f.getMonth() + 1}`;
    if (!to) return fStr;
    const t = new Date(to);
    return `${fStr}–${t.getDate()}/${t.getMonth() + 1}`;
  };

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{singles.length + groups.length} fixtures</span>
        {groups.length > 0 && (
          <span>{groups.length} grouped ({groups.reduce((s, g) => s + g.fixtures.length, 0)} reports)</span>
        )}
        {totalUnresolved > 0 && (
          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
            {totalUnresolved} conflicts
          </Badge>
        )}
        {groups.length > 0 && totalUnresolved === 0 && (
          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
            All resolved
          </Badge>
        )}
      </div>

      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <SortHeader col="vessel_class" className="w-[70px]">Type</SortHeader>
              <SortHeader col="vessel_name">Vessel</SortHeader>
              <SortHeader col="charterer">Charterer</SortHeader>
              <TableHead className="text-xs">Cargo</TableHead>
              <TableHead className="text-xs text-right">Qty</TableHead>
              <SortHeader col="load_port">Load</SortHeader>
              <SortHeader col="discharge_port">Disch</SortHeader>
              <TableHead className="text-xs">Laycan</TableHead>
              <SortHeader col="rate_numeric">Rate</SortHeader>
              <SortHeader col="fixture_status">Status</SortHeader>
              <SortHeader col="report_source">Source</SortHeader>
              <SortHeader col="report_date">Date</SortHeader>
              <TableHead className="text-xs w-[50px]">DWT</TableHead>
              {onEdit && <TableHead className="text-xs w-8" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center text-muted-foreground py-10 text-sm">
                  No fixtures to display
                </TableCell>
              </TableRow>
            )}

            {/* Grouped rows — collapsible */}
            {groups.map((group) => (
              <GroupedFixtureRow
                key={group.vesselKey}
                group={group}
                onResolve={(g) => {
                  const disc = vesselDiscrepancies.get(g.vesselKey);
                  if (disc && onResolve) onResolve(disc);
                  else if (onResolveGroup) onResolveGroup(g);
                }}
                onAutoResolve={(g) => { if (onAutoResolveGroup) onAutoResolveGroup(g); }}
                onEdit={onEdit}
                hasEditCol={!!onEdit}
              />
            ))}

            {/* Single rows */}
            {singles.map((row) => (
              <TableRow key={row.id} className="hover:bg-muted/30">
                <TableCell className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {row.vessel_class || "—"}
                </TableCell>
                <TableCell className="text-xs font-semibold whitespace-nowrap">
                  {row.vessel_name || "TBN"}
                </TableCell>
                <TableCell className="text-xs">{row.charterer || "—"}</TableCell>
                <TableCell className="text-xs uppercase">{row.cargo_grade || row.cargo_type || "—"}</TableCell>
                <TableCell className="text-xs tabular-nums text-right">{row.quantity_mt ? row.quantity_mt.toLocaleString() : "—"}</TableCell>
                <TableCell className="text-xs uppercase whitespace-nowrap">{row.load_port || "—"}</TableCell>
                <TableCell className="text-xs uppercase whitespace-nowrap">{row.discharge_port || "—"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{formatLaycan(row.laycan_from, row.laycan_to)}</TableCell>
                <TableCell className="text-xs font-mono whitespace-nowrap">{row.rate_value || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[row.fixture_status ?? ""] ?? "")}>
                    {row.fixture_status ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {SOURCE_LABELS[row.report_source] ?? row.report_source}
                </TableCell>
                <TableCell className="text-[10px] whitespace-nowrap text-muted-foreground">{row.report_date ?? "—"}</TableCell>
                <TableCell className="text-[10px] tabular-nums text-muted-foreground">{row.dwt ? `${(row.dwt / 1000).toFixed(0)}k` : "—"}</TableCell>
                {onEdit && (
                  <TableCell className="text-center">
                    <button
                      className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                      onClick={() => onEdit(row)}
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
