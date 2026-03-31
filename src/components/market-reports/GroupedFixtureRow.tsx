import { useState } from "react";
import { ChevronRight, ChevronDown, CheckCircle2, AlertTriangle, Wand2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FixtureGroup, ConflictField } from "@/lib/fixtureGrouping";
import { CONFLICT_FIELDS, FIELD_LABEL } from "@/lib/fixtureGrouping";
import type { MarketRecord } from "@/services/marketData";

const SOURCE_LABELS: Record<string, string> = {
  meiwa_vlcc: "Meiwa VLCC", meiwa_dirty: "Meiwa Dirty",
  presco: "Presco", gibson: "Gibson", vantage_dpp: "Vantage DPP",
  eastport: "Eastport", yamamoto: "Yamamoto", alliance: "Alliance",
  bravo_tankers: "Bravo", aq_manual: "AQ Manual",
};

const STATUS_COLORS: Record<string, string> = {
  fixed: "bg-green-100 text-green-800 border-green-300",
  on_subs: "bg-yellow-100 text-yellow-800 border-yellow-300",
  reported: "bg-blue-100 text-blue-800 border-blue-300",
  failed: "bg-red-100 text-red-800 border-red-300",
  withdrawn: "bg-gray-100 text-gray-600 border-gray-300",
};

interface Props {
  group: FixtureGroup;
  onResolve: (group: FixtureGroup) => void;
  onAutoResolve: (group: FixtureGroup) => void;
  onEdit?: (fixture: MarketRecord) => void;
  hasEditCol?: boolean;
}

function formatLaycan(from: string | null, to: string | null) {
  if (!from) return "—";
  const f = new Date(from);
  const fStr = `${f.getDate()}/${f.getMonth() + 1}`;
  if (!to) return fStr;
  const t = new Date(to);
  return `${fStr}–${t.getDate()}/${t.getMonth() + 1}`;
}

function fieldValue(rec: MarketRecord, field: ConflictField): string {
  const v = (rec as unknown as Record<string, unknown>)[field];
  return v != null ? String(v) : "—";
}

function ConflictCell({ field, group, children, className }: {
  field: ConflictField; group: FixtureGroup; children: React.ReactNode; className?: string;
}) {
  const hasConflict = group.conflicts[field];
  const isResolved = group.resolved[field] != null;
  if (!hasConflict) return <TableCell className={className}>{children}</TableCell>;

  return (
    <TableCell className={cn(className, isResolved ? "bg-green-50/50" : "bg-amber-50/50")}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help inline-flex items-center gap-1">
              {children}
              {isResolved
                ? <CheckCircle2 className="h-2.5 w-2.5 text-green-500 shrink-0" />
                : <AlertTriangle className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs font-semibold mb-1">{FIELD_LABEL[field] ?? field}</p>
            {group.fixtures.map((f) => (
              <p key={f.id} className="text-xs">
                <span className="text-muted-foreground">{SOURCE_LABELS[f.report_source] ?? f.report_source}:</span>{" "}
                <span className="font-mono">{fieldValue(f, field)}</span>
              </p>
            ))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </TableCell>
  );
}

export function GroupedFixtureRow({ group, onResolve, onAutoResolve, onEdit, hasEditCol }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { merged } = group;
  const hasConflicts = Object.keys(group.conflicts).length > 0;
  const colCount = hasEditCol ? 14 : 13;

  return (
    <>
      {/* Master row */}
      <TableRow
        className={cn(
          "cursor-pointer hover:bg-muted/40 transition-colors",
          hasConflicts && group.unresolvedCount > 0 && "border-l-2 border-l-amber-400",
          hasConflicts && group.unresolvedCount === 0 && "border-l-2 border-l-green-400"
        )}
        onClick={() => setExpanded((p) => !p)}
      >
        <TableCell className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {merged.vessel_class || "—"}
        </TableCell>

        <TableCell className="text-xs font-semibold whitespace-nowrap">
          <span className="inline-flex items-center gap-1">
            {expanded
              ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
              : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            {merged.vessel_name || "TBN"}
          </span>
          <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0">
            {group.sourceCount}
          </Badge>
          {group.unresolvedCount > 0 && (
            <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200">
              {group.unresolvedCount}
            </Badge>
          )}
        </TableCell>

        <ConflictCell field="charterer" group={group} className="text-xs">{merged.charterer || "—"}</ConflictCell>
        <ConflictCell field="cargo_grade" group={group} className="text-xs uppercase">{merged.cargo_grade || merged.cargo_type || "—"}</ConflictCell>
        <TableCell className="text-xs tabular-nums text-right">{merged.quantity_mt?.toLocaleString() ?? "—"}</TableCell>
        <ConflictCell field="load_port" group={group} className="text-xs uppercase whitespace-nowrap">{merged.load_port || "—"}</ConflictCell>
        <ConflictCell field="discharge_port" group={group} className="text-xs uppercase whitespace-nowrap">{merged.discharge_port || "—"}</ConflictCell>
        <TableCell className="text-xs whitespace-nowrap">{formatLaycan(merged.laycan_from, merged.laycan_to)}</TableCell>
        <ConflictCell field="rate_value" group={group} className="text-xs font-mono whitespace-nowrap">{merged.rate_value || "—"}</ConflictCell>
        <ConflictCell field="fixture_status" group={group}>
          <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[merged.fixture_status ?? ""] ?? "")}>
            {merged.fixture_status ?? "—"}
          </Badge>
        </ConflictCell>
        <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
          {group.sources.map((s) => SOURCE_LABELS[s] ?? s).join(", ")}
        </TableCell>
        <TableCell className="text-[10px] whitespace-nowrap text-muted-foreground">{merged.report_date ?? "—"}</TableCell>
        <TableCell className="text-[10px] tabular-nums text-muted-foreground">{merged.dwt ? `${(merged.dwt / 1000).toFixed(0)}k` : "—"}</TableCell>
        {hasEditCol && <TableCell />}
      </TableRow>

      {/* Expanded content */}
      {expanded && (
        <>
          {/* Action bar */}
          {hasConflicts && (
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableCell colSpan={colCount} className="py-1.5 px-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1"
                    onClick={(e) => { e.stopPropagation(); onResolve(group); }}>
                    <CheckCircle2 className="h-3 w-3" /> Resolve
                  </Button>
                  {group.unresolvedCount > 0 && (
                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1"
                      onClick={(e) => { e.stopPropagation(); onAutoResolve(group); }}>
                      <Wand2 className="h-3 w-3" /> Auto-resolve ({group.unresolvedCount})
                    </Button>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-1">
                    {(Object.keys(group.conflicts) as ConflictField[]).map((f) => FIELD_LABEL[f] ?? f).join(" · ")}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          )}

          {/* Sub-rows per broker */}
          {group.fixtures.map((f) => (
            <TableRow key={f.id} className="bg-muted/5 hover:bg-muted/15 text-muted-foreground">
              <TableCell className="text-[10px]" />
              <TableCell className="text-xs pl-7 whitespace-nowrap">
                <Badge variant="outline" className="text-[9px]">
                  {SOURCE_LABELS[f.report_source] ?? f.report_source}
                </Badge>
              </TableCell>
              <TableCell className={cn("text-xs", group.conflicts.charterer && "text-foreground")}>{f.charterer || "—"}</TableCell>
              <TableCell className={cn("text-xs uppercase", group.conflicts.cargo_grade && "text-foreground")}>{f.cargo_grade || f.cargo_type || "—"}</TableCell>
              <TableCell className="text-xs tabular-nums text-right">{f.quantity_mt?.toLocaleString() ?? "—"}</TableCell>
              <TableCell className={cn("text-xs uppercase whitespace-nowrap", group.conflicts.load_port && "text-foreground")}>{f.load_port || "—"}</TableCell>
              <TableCell className={cn("text-xs uppercase whitespace-nowrap", group.conflicts.discharge_port && "text-foreground")}>{f.discharge_port || "—"}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{formatLaycan(f.laycan_from, f.laycan_to)}</TableCell>
              <TableCell className={cn("text-xs font-mono whitespace-nowrap", group.conflicts.rate_value && "text-foreground")}>{f.rate_value || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[f.fixture_status ?? ""] ?? "")}>{f.fixture_status ?? "—"}</Badge>
              </TableCell>
              <TableCell className="text-[10px]">{SOURCE_LABELS[f.report_source] ?? f.report_source}</TableCell>
              <TableCell className="text-[10px]">{f.report_date ?? "—"}</TableCell>
              <TableCell className="text-[10px] tabular-nums">{f.dwt ? `${(f.dwt / 1000).toFixed(0)}k` : "—"}</TableCell>
              {hasEditCol && onEdit && (
                <TableCell className="text-center">
                  <button className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors"
                    onClick={(e) => { e.stopPropagation(); onEdit(f); }}>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </>
      )}
    </>
  );
}
