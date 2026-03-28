import { Badge } from "@/components/ui/badge";
import { Compass } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { MarketRecord } from "@/services/marketData";

interface Props {
  records: MarketRecord[];
}

export function BalticRoutesTable({ records }: Props) {
  if (records.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Baltic Routes</h3>
        <Badge variant="secondary" className="text-xs">{records.length}</Badge>
      </div>
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Route</TableHead>
              <TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs">Size</TableHead>
              <TableHead className="text-xs text-right">World Scale</TableHead>
              <TableHead className="text-xs text-right">TC Earnings ($/day)</TableHead>
              <TableHead className="text-xs">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono font-medium">{r.baltic_route ?? "—"}</TableCell>
                <TableCell className="text-xs">{r.baltic_description ?? "—"}</TableCell>
                <TableCell className="text-xs tabular-nums">{r.baltic_size ?? "—"}</TableCell>
                <TableCell className="text-xs tabular-nums text-right">{r.world_scale?.toFixed(2) ?? "—"}</TableCell>
                <TableCell className="text-xs tabular-nums text-right">{r.tc_earnings?.toLocaleString() ?? "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.source_broker ?? r.report_source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
