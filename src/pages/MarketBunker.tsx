import { useState, useEffect, useCallback } from "react";
import { Fuel, Loader2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";

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

function PriceChange({ val }: { val: number | null }) {
  if (val == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("text-xs font-medium", val > 0 ? "text-red-600" : val < 0 ? "text-green-600" : "text-muted-foreground")}>
      {val > 0 ? "+" : ""}{val.toFixed(2)}
    </span>
  );
}

export default function MarketBunker() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<BunkerRow[]>([]);
  const [allDates, setAllDates] = useState<BunkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"today" | "history">("today");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("market_data")
      .select("id, report_date, bunker_region, vlsfo_price, vlsfo_change, ifo380_price, ifo380_change, mgo_price, mgo_change, report_source")
      .eq("record_type", "BUNKER")
      .eq("report_date", date)
      .order("bunker_region");
    setRows((data ?? []) as BunkerRow[]);

    const { data: hist } = await supabase
      .from("market_data")
      .select("id, report_date, bunker_region, vlsfo_price, vlsfo_change, ifo380_price, ifo380_change, mgo_price, mgo_change, report_source")
      .eq("record_type", "BUNKER")
      .order("report_date", { ascending: false })
      .order("bunker_region")
      .limit(100);
    setAllDates((hist ?? []) as BunkerRow[]);
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

  const displayRows = view === "today" ? rows : allDates;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Bunker Prices</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Button variant="outline" size="sm" onClick={handleFetchBunker}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Fetch Today
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={view === "today" ? "secondary" : "ghost"} size="sm" onClick={() => setView("today")}>
          Today <Badge variant="secondary" className="ml-1 text-[10px]">{rows.length}</Badge>
        </Button>
        <Button variant={view === "history" ? "secondary" : "ghost"} size="sm" onClick={() => setView("history")}>
          History <Badge variant="secondary" className="ml-1 text-[10px]">{allDates.length}</Badge>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : displayRows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No bunker prices for this date. Click "Fetch Today" to import from Ship & Bunker.
        </p>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {view === "history" && <TableHead className="text-xs">Date</TableHead>}
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
              {displayRows.map((r) => (
                <TableRow key={r.id}>
                  {view === "history" && <TableCell className="text-xs whitespace-nowrap">{r.report_date}</TableCell>}
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
    </div>
  );
}
