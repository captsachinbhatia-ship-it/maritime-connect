import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
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
import type { MarketFixture } from "@/services/marketData";

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
};

type SortCol =
  | "vessel_name"
  | "charterer"
  | "load_port"
  | "discharge_port"
  | "rate_numeric"
  | "fixture_status"
  | "report_source";

interface Props {
  fixtures: MarketFixture[];
  vesselClass: string;
}

export function FixtureTable({ fixtures, vesselClass }: Props) {
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
      const av = (a as Record<string, unknown>)[sortCol];
      const bv = (b as Record<string, unknown>)[sortCol];
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

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{vesselClass}</h3>
        <Badge variant="secondary" className="text-xs">
          {fixtures.length}
        </Badge>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center text-muted-foreground py-6 text-xs"
                >
                  No fixtures for {vesselClass}
                </TableCell>
              </TableRow>
            )}
            {sorted.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-xs font-medium whitespace-nowrap">
                  {row.vessel_name || "TBN"}
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {row.dwt ? row.dwt.toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-xs">
                  {row.charterer || "—"}
                </TableCell>
                <TableCell className="text-xs uppercase">
                  {row.cargo_grade || row.cargo_type || "—"}
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {row.quantity_mt ? row.quantity_mt.toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-xs uppercase whitespace-nowrap">
                  {row.load_port || "—"}
                  {row.load_region && (
                    <span className="text-muted-foreground ml-1">
                      ({row.load_region})
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs uppercase whitespace-nowrap">
                  {row.discharge_port || "—"}
                  {row.discharge_region && (
                    <span className="text-muted-foreground ml-1">
                      ({row.discharge_region})
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatLaycan(row.laycan_from, row.laycan_to)}
                </TableCell>
                <TableCell className="text-xs font-mono whitespace-nowrap">
                  {row.rate_value || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      STATUS_COLORS[row.fixture_status ?? ""] ?? ""
                    )}
                  >
                    {row.fixture_status ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {SOURCE_LABELS[row.report_source] ?? row.report_source}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
