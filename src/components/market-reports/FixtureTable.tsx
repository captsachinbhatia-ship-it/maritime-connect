import { useMemo, useState } from "react";
import { ArrowUpDown, AlertTriangle, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  bravo_tankers: "Bravo Tankers",
};

type SortCol =
  | "vessel_name"
  | "charterer"
  | "load_port"
  | "discharge_port"
  | "rate_numeric"
  | "fixture_status"
  | "report_source"
  | "report_date";

interface Props {
  fixtures: MarketFixture[];
  vesselClass: string;
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
  vesselClass,
  fixtureFieldMap,
  vesselDiscrepancies,
  onResolve,
  onResolveGroup,
  onAutoResolveGroup,
  onEdit,
  resolutions = [],
}: Props) {
  const [sortCol, setSortCol] = useState<SortCol>("vessel_name");
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortAsc((p) => !p);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
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
      const cmp = String(av).localeCompare(String(bv), undefined, {
        numeric: true,
      });
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [fixtures, sortCol, sortAsc]);

  // Group fixtures by vessel name — multi-source vessels become collapsible groups
  const { singles, groups } = useMemo(
    () => groupFixtures(sorted, resolutions),
    [sorted, resolutions]
  );

  // Sort singles the same way as the full list
  const sortedSingles = singles;

  const SortHeader = ({
    col,
    children,
    className,
  }: {
    col: SortCol;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={cn(
        "cursor-pointer select-none whitespace-nowrap text-xs",
        className
      )}
      onClick={() => toggleSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
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

  const getDiscrepancyTooltip = (
    fixtureId: string,
    field: string
  ): string | null => {
    const fields = fixtureFieldMap.get(fixtureId);
    if (!fields?.has(field)) return null;

    // Find the vessel discrepancy for this fixture
    for (const disc of vesselDiscrepancies.values()) {
      if (!disc.fixtureIds.includes(fixtureId)) continue;
      const fd = disc.fields.find((f) => f.field === field);
      if (!fd) return null;
      return Object.entries(fd.values)
        .map(([src, val]) => `${SOURCE_LABELS[src] ?? src}: ${val ?? "—"}`)
        .join("\n");
    }
    return null;
  };

  const DiscrepantCell = ({
    fixtureId,
    field,
    children,
    className,
  }: {
    fixtureId: string;
    field: string;
    children: React.ReactNode;
    className?: string;
  }) => {
    const tooltip = getDiscrepancyTooltip(fixtureId, field);
    if (!tooltip) {
      return <TableCell className={className}>{children}</TableCell>;
    }
    return (
      <TableCell className={cn(className, "bg-amber-100/60")}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{children}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs font-semibold mb-1">Cross-report values:</p>
              {tooltip.split("\n").map((line, i) => (
                <p key={i} className="text-xs">
                  {line}
                </p>
              ))}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    );
  };

  const groupedCount = groups.length;
  const totalUnresolved = groups.reduce((sum, g) => sum + g.unresolvedCount, 0);
  const totalConflicts = groups.reduce((sum, g) => sum + Object.keys(g.conflicts).length, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{vesselClass}</h3>
        <Badge variant="secondary" className="text-xs">
          {singles.length + groups.length} vessel{singles.length + groups.length !== 1 ? "s" : ""}
        </Badge>
        {groupedCount > 0 && (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            {groupedCount} grouped
          </Badge>
        )}
        {totalUnresolved > 0 && (
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {totalUnresolved} unresolved
          </Badge>
        )}
        {totalConflicts > 0 && totalUnresolved === 0 && (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            All resolved
          </Badge>
        )}
      </div>

      <div className="rounded-lg border overflow-auto max-h-[50vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader col="vessel_name">Vessel</SortHeader>
              <TableHead className="text-xs whitespace-nowrap">DWT</TableHead>
              <SortHeader col="charterer">Charterer</SortHeader>
              <TableHead className="text-xs">Cargo</TableHead>
              <TableHead className="text-xs">Qty MT</TableHead>
              <SortHeader col="load_port">Load</SortHeader>
              <SortHeader col="discharge_port">Disch</SortHeader>
              <TableHead className="text-xs">Laycan</TableHead>
              <SortHeader col="rate_numeric">Rate</SortHeader>
              <SortHeader col="fixture_status">Status</SortHeader>
              <SortHeader col="report_source">Source</SortHeader>
              <SortHeader col="report_date">Report Date</SortHeader>
              {onEdit && <TableHead className="text-xs w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={onEdit ? 13 : 12}
                  className="text-center text-muted-foreground py-6 text-xs"
                >
                  No fixtures for {vesselClass}
                </TableCell>
              </TableRow>
            )}

            {/* Grouped rows (multi-source vessels) — collapsible */}
            {groups.map((group) => (
              <GroupedFixtureRow
                key={group.vesselKey}
                group={group}
                onResolve={(g) => {
                  // Find the matching VesselDiscrepancy and call onResolve
                  const disc = vesselDiscrepancies.get(g.vesselKey);
                  if (disc && onResolve) onResolve(disc);
                  else if (onResolveGroup) onResolveGroup(g);
                }}
                onAutoResolve={(g) => {
                  if (onAutoResolveGroup) onAutoResolveGroup(g);
                }}
                onEdit={onEdit}
                hasEditCol={!!onEdit}
              />
            ))}

            {/* Single rows (one source only) — standard rendering */}
            {sortedSingles.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs font-medium whitespace-nowrap">
                  {row.vessel_name || "TBN"}
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {row.dwt ? row.dwt.toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-xs">{row.charterer || "—"}</TableCell>
                <TableCell className="text-xs uppercase">{row.cargo_grade || row.cargo_type || "—"}</TableCell>
                <TableCell className="text-xs tabular-nums">{row.quantity_mt ? row.quantity_mt.toLocaleString() : "—"}</TableCell>
                <TableCell className="text-xs uppercase whitespace-nowrap">{row.load_port || "—"}</TableCell>
                <TableCell className="text-xs uppercase whitespace-nowrap">{row.discharge_port || "—"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{formatLaycan(row.laycan_from, row.laycan_to)}</TableCell>
                <TableCell className="text-xs font-mono whitespace-nowrap">{row.rate_value || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[row.fixture_status ?? ""] ?? "")}>
                    {row.fixture_status ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {SOURCE_LABELS[row.report_source] ?? row.report_source}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{row.report_date ?? "—"}</TableCell>
                {onEdit && (
                  <TableCell className="text-center">
                    <button
                      className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                      onClick={() => onEdit(row)}
                      title="Edit fixture"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
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
