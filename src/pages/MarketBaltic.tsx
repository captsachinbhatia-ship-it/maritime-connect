import { useState } from "react";
import { Compass, Loader2, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useBalticRoutes, useRatesAssessment } from "@/hooks/useMarketData";

export default function MarketBaltic() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { tcRoutes, tdRoutes, loading: balticLoading } = useBalticRoutes(date);
  const { rates, loading: ratesLoading } = useRatesAssessment(date);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Baltic Routes & Rate Assessments</h1>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
      </div>

      {/* Clean TC Routes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Clean Tanker Routes (TC)</h2>
          <Badge variant="secondary" className="text-xs">{tcRoutes.length}</Badge>
        </div>
        {balticLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : tcRoutes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No TC route data for this date. Upload a Bravo Tankers report to populate.</p>
        ) : (
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Route</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Size</TableHead>
                  <TableHead className="text-xs text-right">World Scale</TableHead>
                  <TableHead className="text-xs text-right">WS Change</TableHead>
                  <TableHead className="text-xs text-right">TC Earnings ($/day)</TableHead>
                  <TableHead className="text-xs text-right">TCE Change</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tcRoutes.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono font-bold">{String(r.route ?? "")}</TableCell>
                    <TableCell className="text-xs">{String(r.description ?? "")}</TableCell>
                    <TableCell className="text-xs">{String(r.size_mt ?? "")}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.worldscale != null ? Number(r.worldscale).toFixed(2) : "—"}</TableCell>
                    <TableCell className={cn("text-xs tabular-nums text-right", Number(r.ws_change) > 0 ? "text-green-600" : Number(r.ws_change) < 0 ? "text-red-600" : "")}>
                      {r.ws_change != null ? (Number(r.ws_change) > 0 ? "+" : "") + Number(r.ws_change).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.tc_earnings_usd != null ? `$${Number(r.tc_earnings_usd).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className={cn("text-xs tabular-nums text-right", Number(r.tc_change) > 0 ? "text-green-600" : Number(r.tc_change) < 0 ? "text-red-600" : "")}>
                      {r.tc_change != null ? (Number(r.tc_change) > 0 ? "+" : "") + Number(r.tc_change).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{String(r.source_broker ?? "")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dirty TD Routes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Dirty Tanker Routes (TD)</h2>
          <Badge variant="secondary" className="text-xs">{tdRoutes.length}</Badge>
        </div>
        {balticLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : tdRoutes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No TD route data for this date.</p>
        ) : (
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Route</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Size</TableHead>
                  <TableHead className="text-xs text-right">World Scale</TableHead>
                  <TableHead className="text-xs text-right">WS Change</TableHead>
                  <TableHead className="text-xs text-right">TC Earnings ($/day)</TableHead>
                  <TableHead className="text-xs text-right">TCE Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tdRoutes.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono font-bold">{String(r.route ?? "")}</TableCell>
                    <TableCell className="text-xs">{String(r.description ?? "")}</TableCell>
                    <TableCell className="text-xs">{String(r.size_mt ?? "")}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.worldscale != null ? Number(r.worldscale).toFixed(2) : "—"}</TableCell>
                    <TableCell className={cn("text-xs tabular-nums text-right", Number(r.ws_change) > 0 ? "text-green-600" : Number(r.ws_change) < 0 ? "text-red-600" : "")}>
                      {r.ws_change != null ? (Number(r.ws_change) > 0 ? "+" : "") + Number(r.ws_change).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-right">{r.tc_earnings_usd != null ? `$${Number(r.tc_earnings_usd).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className={cn("text-xs tabular-nums text-right", Number(r.tc_change) > 0 ? "text-green-600" : Number(r.tc_change) < 0 ? "text-red-600" : "")}>
                      {r.tc_change != null ? (Number(r.tc_change) > 0 ? "+" : "") + Number(r.tc_change).toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Rate Assessments */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <h2 className="text-lg font-semibold">Bravo Rate Assessments</h2>
          <Badge variant="secondary" className="text-xs">{rates.length}</Badge>
        </div>
        {ratesLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No rate assessments for this date. Upload a Bravo Rates Grid report.</p>
        ) : (
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Class</TableHead>
                  <TableHead className="text-xs">Size (kt)</TableHead>
                  <TableHead className="text-xs">Route</TableHead>
                  <TableHead className="text-xs">Load</TableHead>
                  <TableHead className="text-xs">Discharge</TableHead>
                  <TableHead className="text-xs text-right">Rate</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Confidence</TableHead>
                  <TableHead className="text-xs">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-medium">{String(r.vessel_class ?? "")}</TableCell>
                    <TableCell className="text-xs tabular-nums">{String(r.size_kt ?? "")}</TableCell>
                    <TableCell className="text-xs font-mono">{String(r.route_raw ?? "")}</TableCell>
                    <TableCell className="text-xs">{String(r.load_port ?? "")}</TableCell>
                    <TableCell className="text-xs">{String(r.discharge_port ?? "")}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right font-medium">
                      {r.rate_ws != null ? `WS ${Number(r.rate_ws).toFixed(0)}` : r.rate_lumpsum != null ? `$${(Number(r.rate_lumpsum) / 1_000_000).toFixed(1)}M` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{String(r.rate_type ?? "")}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className={cn("text-[9px]",
                        r.confidence === "FIRM" ? "bg-green-50 text-green-700 border-green-200" :
                        r.confidence === "UNTESTED" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                        "bg-gray-50 text-gray-600 border-gray-200"
                      )}>
                        {String(r.confidence ?? "")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{String(r.notes ?? "")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
