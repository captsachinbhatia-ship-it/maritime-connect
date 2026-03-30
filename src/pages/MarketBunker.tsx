import { useState, useEffect, useCallback } from "react";
import { Fuel, Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, Droplets } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";

// ── Bunker types ──

interface BunkerRow {
  id: string;
  report_date: string;
  bunker_region: string | null;
  vlsfo_price: number | null;
  vlsfo_change: number | null;
  ifo380_price: number | null;
  ifo380_change: number | null;
  mgo_price: number | null;
  mgo_change: number | null;
  report_source: string | null;
}

// ── Oil price types ──

interface OilRow {
  id: string;
  report_date: string;
  cargo_grade: string | null;   // commodity name
  rate_numeric: number | null;  // price
  rate_value: string | null;    // change e.g. "+2.00"
  rate_type: string | null;     // change_pct e.g. "+2.01%"
}

// ── Shared components ──

function PriceChange({ val }: { val: number | null }) {
  if (val == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("text-xs font-medium", val > 0 ? "text-red-600" : val < 0 ? "text-green-600" : "text-muted-foreground")}>
      {val > 0 ? "+" : ""}{val.toFixed(2)}
    </span>
  );
}

function ChangeIcon({ val }: { val: number | null }) {
  if (val == null || val === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
  return val > 0
    ? <TrendingUp className="h-3 w-3 text-red-500" />
    : <TrendingDown className="h-3 w-3 text-green-500" />;
}

export default function MarketBunker() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bunkerRows, setBunkerRows] = useState<BunkerRow[]>([]);
  const [bunkerHistory, setBunkerHistory] = useState<BunkerRow[]>([]);
  const [oilRows, setOilRows] = useState<OilRow[]>([]);
  const [oilHistory, setOilHistory] = useState<OilRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bunkerView, setBunkerView] = useState<"today" | "history">("today");
  const [oilView, setOilView] = useState<"today" | "history">("today");

  const load = useCallback(async () => {
    setLoading(true);

    // Bunker prices for selected date
    const { data: bunker } = await supabase
      .from("market_data")
      .select("id, report_date, bunker_region, vlsfo_price, vlsfo_change, ifo380_price, ifo380_change, mgo_price, mgo_change, report_source")
      .eq("record_type", "BUNKER")
      .eq("report_date", date)
      .order("bunker_region");
    setBunkerRows((bunker ?? []) as BunkerRow[]);

    // Bunker history
    const { data: bunkerHist } = await supabase
      .from("market_data")
      .select("id, report_date, bunker_region, vlsfo_price, vlsfo_change, ifo380_price, ifo380_change, mgo_price, mgo_change, report_source")
      .eq("record_type", "BUNKER")
      .order("report_date", { ascending: false })
      .order("bunker_region")
      .limit(100);
    setBunkerHistory((bunkerHist ?? []) as BunkerRow[]);

    // Oil prices for selected date
    const { data: oil } = await supabase
      .from("market_data")
      .select("id, report_date, cargo_grade, rate_numeric, rate_value, rate_type")
      .eq("record_type", "OIL_PRICE")
      .eq("report_date", date)
      .order("cargo_grade");
    setOilRows((oil ?? []) as OilRow[]);

    // Oil history
    const { data: oilHist } = await supabase
      .from("market_data")
      .select("id, report_date, cargo_grade, rate_numeric, rate_value, rate_type")
      .eq("record_type", "OIL_PRICE")
      .order("report_date", { ascending: false })
      .order("cargo_grade")
      .limit(100);
    setOilHistory((oilHist ?? []) as OilRow[]);

    setLoading(false);
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const handleFetchBunker = async () => {
    const { fetchBunkerPrices } = await import("@/services/marketData");
    const { inserted, skipped, error } = await fetchBunkerPrices();
    if (error) toast({ title: "Failed", description: error, variant: "destructive" });
    else if (skipped) toast({ title: "Already fetched", description: "Bunker prices already imported today." });
    else { toast({ title: "Imported", description: `${inserted} port prices saved.` }); load(); }
  };

  const handleFetchOil = async () => {
    const { fetchOilPrices } = await import("@/services/marketData");
    const { inserted, skipped, error } = await fetchOilPrices();
    if (error) toast({ title: "Failed", description: error, variant: "destructive" });
    else if (skipped) toast({ title: "Already fetched", description: "Oil prices already imported today." });
    else { toast({ title: "Imported", description: `${inserted} commodity prices saved.` }); load(); }
  };

  const displayBunker = bunkerView === "today" ? bunkerRows : bunkerHistory;
  const displayOil = oilView === "today" ? oilRows : oilHistory;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bunker & Oil Prices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ship & Bunker + OilPrice.com</p>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* ═══════ BUNKER PRICES ═══════ */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold">Bunker Prices</h2>
                <Badge variant="outline" className="text-[10px]">Ship & Bunker</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={bunkerView === "today" ? "secondary" : "ghost"} size="sm" onClick={() => setBunkerView("today")}>
                  Today <Badge variant="secondary" className="ml-1 text-[10px]">{bunkerRows.length}</Badge>
                </Button>
                <Button variant={bunkerView === "history" ? "secondary" : "ghost"} size="sm" onClick={() => setBunkerView("history")}>
                  History <Badge variant="secondary" className="ml-1 text-[10px]">{bunkerHistory.length}</Badge>
                </Button>
                <Button variant="outline" size="sm" onClick={handleFetchBunker}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Fetch
                </Button>
              </div>
            </div>

            {displayBunker.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No bunker prices for this date. Click "Fetch" to import from Ship & Bunker.
              </p>
            ) : (
              <div className="rounded-lg border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {bunkerView === "history" && <TableHead className="text-xs">Date</TableHead>}
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
                    {displayBunker.map((r) => (
                      <TableRow key={r.id}>
                        {bunkerView === "history" && <TableCell className="text-xs whitespace-nowrap">{r.report_date}</TableCell>}
                        <TableCell className="text-xs font-medium">{r.bunker_region ?? "—"}</TableCell>
                        <TableCell className="text-xs tabular-nums text-right font-medium">{r.vlsfo_price?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell className="text-right"><PriceChange val={r.vlsfo_change} /></TableCell>
                        <TableCell className="text-xs tabular-nums text-right font-medium">{r.ifo380_price?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell className="text-right"><PriceChange val={r.ifo380_change} /></TableCell>
                        <TableCell className="text-xs tabular-nums text-right font-medium">{r.mgo_price?.toFixed(2) ?? "—"}</TableCell>
                        <TableCell className="text-right"><PriceChange val={r.mgo_change} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{r.report_source ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* ═══════ OIL PRICES ═══════ */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Crude Oil & Energy Prices</h2>
                <Badge variant="outline" className="text-[10px]">oilprice.com</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={oilView === "today" ? "secondary" : "ghost"} size="sm" onClick={() => setOilView("today")}>
                  Today <Badge variant="secondary" className="ml-1 text-[10px]">{oilRows.length}</Badge>
                </Button>
                <Button variant={oilView === "history" ? "secondary" : "ghost"} size="sm" onClick={() => setOilView("history")}>
                  History <Badge variant="secondary" className="ml-1 text-[10px]">{oilHistory.length}</Badge>
                </Button>
                <Button variant="outline" size="sm" onClick={handleFetchOil}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Fetch
                </Button>
              </div>
            </div>

            {displayOil.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No oil prices for this date. Click "Fetch" to import from oilprice.com.
              </p>
            ) : (
              <>
                {/* Card grid for key benchmarks */}
                {oilView === "today" && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {displayOil.slice(0, 4).map((r) => {
                      const change = r.rate_value ? parseFloat(r.rate_value) : null;
                      return (
                        <Card key={r.id}>
                          <CardHeader className="pb-1 pt-3 px-4">
                            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <ChangeIcon val={change} />
                              {r.cargo_grade}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pb-3 px-4">
                            <div className="flex items-end gap-2">
                              <span className="text-2xl font-bold tabular-nums">${r.rate_numeric?.toFixed(2)}</span>
                              {change != null && (
                                <span className={cn("text-xs font-medium pb-0.5", change > 0 ? "text-red-600" : change < 0 ? "text-green-600" : "text-muted-foreground")}>
                                  {r.rate_value} ({r.rate_type})
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Full table */}
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {oilView === "history" && <TableHead className="text-xs">Date</TableHead>}
                        <TableHead className="text-xs">Commodity</TableHead>
                        <TableHead className="text-xs text-right">Price (USD)</TableHead>
                        <TableHead className="text-xs text-right">Change</TableHead>
                        <TableHead className="text-xs text-right">% Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayOil.map((r) => {
                        const change = r.rate_value ? parseFloat(r.rate_value) : null;
                        return (
                          <TableRow key={r.id}>
                            {oilView === "history" && <TableCell className="text-xs whitespace-nowrap">{r.report_date}</TableCell>}
                            <TableCell className="text-xs font-medium">{r.cargo_grade ?? "—"}</TableCell>
                            <TableCell className="text-xs tabular-nums text-right font-semibold">${r.rate_numeric?.toFixed(2) ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              {change != null ? (
                                <span className={cn("text-xs font-medium", change > 0 ? "text-red-600" : change < 0 ? "text-green-600" : "text-muted-foreground")}>
                                  {r.rate_value}
                                </span>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {r.rate_type ? (
                                <Badge variant="outline" className={cn("text-[10px]",
                                  change != null && change > 0 ? "border-red-200 text-red-700" :
                                  change != null && change < 0 ? "border-green-200 text-green-700" : ""
                                )}>
                                  {r.rate_type}
                                </Badge>
                              ) : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
