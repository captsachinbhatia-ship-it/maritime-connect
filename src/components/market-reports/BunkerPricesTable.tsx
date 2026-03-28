import { Badge } from "@/components/ui/badge";
import { Fuel } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { MarketRecord } from "@/services/marketData";

interface Props {
  records: MarketRecord[];
}

function PriceChange({ change }: { change: number | null }) {
  if (change == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("text-[10px]", change > 0 ? "text-red-600" : change < 0 ? "text-green-600" : "text-muted-foreground")}>
      {change > 0 ? "+" : ""}{change.toFixed(2)}
    </span>
  );
}

export function BunkerPricesTable({ records }: Props) {
  if (records.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Fuel className="h-4 w-4" />
        <h3 className="text-sm font-semibold">Bunker Prices</h3>
        <Badge variant="secondary" className="text-xs">{records.length}</Badge>
      </div>
      <div className="rounded-lg border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Region</TableHead>
              <TableHead className="text-xs text-right">VLSFO</TableHead>
              <TableHead className="text-xs text-right">+/-</TableHead>
              <TableHead className="text-xs text-right">IFO 380</TableHead>
              <TableHead className="text-xs text-right">+/-</TableHead>
              <TableHead className="text-xs text-right">MGO</TableHead>
              <TableHead className="text-xs text-right">+/-</TableHead>
              <TableHead className="text-xs">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-medium">{r.bunker_region ?? "—"}</TableCell>
                <TableCell className="text-xs tabular-nums text-right">{r.vlsfo_price?.toFixed(2) ?? "—"}</TableCell>
                <TableCell className="text-right"><PriceChange change={r.vlsfo_change} /></TableCell>
                <TableCell className="text-xs tabular-nums text-right">{r.ifo380_price?.toFixed(2) ?? "—"}</TableCell>
                <TableCell className="text-right"><PriceChange change={r.ifo380_change} /></TableCell>
                <TableCell className="text-xs tabular-nums text-right">{r.mgo_price?.toFixed(2) ?? "—"}</TableCell>
                <TableCell className="text-right"><PriceChange change={r.mgo_change} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.source_broker ?? r.report_source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
