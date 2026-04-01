import { useEffect, useState, useMemo, useCallback } from "react";
import { Download, Search, Ship, FileText, Upload } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PositionScanPanel } from "@/components/vessel-positions/PositionScanPanel";
import { AddPositionDialog } from "@/components/vessel-positions/AddPositionDialog";
import {
  fetchPositions,
  fetchPositionDates,
  type VesselPosition,
  type PositionFilters,
} from "@/services/vesselPositions";
import { generatePositionPdf } from "@/lib/generatePositionPdf";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

const CLASS_ORDER = ["VLCC", "Suezmax", "Aframax", "LR2", "LR1", "MR", "Handy", "Specialized", "Other"];

const CLASS_COLORS: Record<string, string> = {
  VLCC: "bg-red-100 text-red-800 border-red-300",
  Suezmax: "bg-orange-100 text-orange-800 border-orange-300",
  Aframax: "bg-amber-100 text-amber-800 border-amber-300",
  LR2: "bg-blue-100 text-blue-800 border-blue-300",
  LR1: "bg-cyan-100 text-cyan-800 border-cyan-300",
  MR: "bg-green-100 text-green-800 border-green-300",
  Handy: "bg-purple-100 text-purple-800 border-purple-300",
  Specialized: "bg-gray-100 text-gray-800 border-gray-300",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  on_subs: "bg-yellow-100 text-yellow-800",
  fixed: "bg-blue-100 text-blue-800",
  ballasting: "bg-orange-100 text-orange-800",
  in_dock: "bg-gray-100 text-gray-600",
};

export default function VesselPositions() {
  const [positions, setPositions] = useState<VesselPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<string[]>([]);
  const [filters, setFilters] = useState<PositionFilters>({});
  const [activeTab, setActiveTab] = useState("positions");

  // Import & Scan state
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<{ positions: { vessel_name: string; vessel_class: string | null; open_port: string | null }[]; source_name: string; count: number } | null>(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pos, dt] = await Promise.all([
        fetchPositions(filters),
        fetchPositionDates(),
      ]);
      setPositions(pos);
      setDates(dt);
    } catch (err) {
      console.error("Failed to load positions:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [filters.report_date, filters.vessel_class, filters.open_region, filters.status, load]);

  const filtered = useMemo(() => {
    if (!filters.search) return positions;
    const q = filters.search.toLowerCase();
    return positions.filter(
      (p) =>
        p.vessel_name.toLowerCase().includes(q) ||
        (p.owner ?? "").toLowerCase().includes(q) ||
        (p.operator ?? "").toLowerCase().includes(q) ||
        (p.open_port ?? "").toLowerCase().includes(q)
    );
  }, [positions, filters.search]);

  // Group by vessel class
  const grouped = useMemo(() => {
    const map = new Map<string, VesselPosition[]>();
    for (const p of filtered) {
      const cls = p.vessel_class ?? "Other";
      if (!map.has(cls)) map.set(cls, []);
      map.get(cls)!.push(p);
    }
    return map;
  }, [filtered]);

  const stats = useMemo(() => {
    const classes = new Set(filtered.map((p) => p.vessel_class).filter(Boolean));
    const regions = new Set(filtered.map((p) => p.open_region).filter(Boolean));
    const sources = new Set(filtered.map((p) => p.source_name).filter(Boolean));
    return { total: filtered.length, classes: classes.size, regions: regions.size, sources: sources.size };
  }, [filtered]);

  const uniqueClasses = useMemo(() => [...new Set(positions.map((p) => p.vessel_class).filter(Boolean))].sort(), [positions]);
  const uniqueRegions = useMemo(() => [...new Set(positions.map((p) => p.open_region).filter(Boolean))].sort(), [positions]);

  const handleExportCsv = () => {
    const headers = ["Vessel", "Class", "DWT", "Built", "Owner", "Operator", "Open Port", "Region", "Open Date", "L3C", "Coating", "Status", "Source", "Comments"];
    const rows = filtered.map((p) => [
      p.vessel_name, p.vessel_class ?? "", p.dwt ?? "", p.built_year ?? "",
      p.owner ?? "", p.operator ?? "", p.open_port ?? "", p.open_region ?? "",
      p.open_date_text ?? p.open_date ?? "", p.cargo_history ?? "", p.coating ?? "",
      p.status ?? "", p.source_name ?? "", p.comments ?? "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vessel_positions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (filtered.length === 0) {
      toast.error("No positions to export");
      return;
    }
    generatePositionPdf(filtered, filters.report_date);
    toast.success("PDF downloaded");
  };

  // Parse pasted email text
  const handleParseEmail = async () => {
    if (!pasteText.trim() || pasteText.length < 30) {
      toast.error("Paste at least 30 characters of position list email text");
      return;
    }
    setParsing(true);
    setParseResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("parse-email-positions", {
        body: { email_text: pasteText.slice(0, 8000) },
      });
      if (error) throw error;
      setParseResult(data);
      toast.success(`Extracted ${data.count ?? data.positions?.length ?? 0} positions from ${data.source_name ?? "unknown"}`);
    } catch (err) {
      toast.error(`Parse failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setParsing(false);
    }
  };

  // Import parsed positions
  const handleImportParsed = async () => {
    if (!parseResult) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-email-positions", {
        body: { email_text: pasteText.slice(0, 8000), selected_ids: "ALL" },
      });
      if (error) throw error;
      toast.success(`Imported ${data.inserted ?? 0} positions`);
      setParseResult(null);
      setPasteText("");
      setActiveTab("positions");
      load();
    } catch (err) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ship className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Vessel Positions</h1>
            <p className="text-sm text-muted-foreground">
              Daily position lists from owners & operators
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCsv} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadPdf} className="gap-2">
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <AddPositionDialog onAdded={load} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="positions" className="gap-2">
            <Ship className="h-4 w-4" /> Positions
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" /> Import & Scan
          </TabsTrigger>
        </TabsList>

        {/* ── POSITIONS TAB ──────────────────────────────────── */}
        <TabsContent value="positions" className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="py-3 px-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Vessels</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <div className="text-2xl font-bold">{stats.classes}</div>
                <div className="text-xs text-muted-foreground">Vessel Classes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <div className="text-2xl font-bold">{stats.regions}</div>
                <div className="text-xs text-muted-foreground">Regions</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 px-4">
                <div className="text-2xl font-bold">{stats.sources}</div>
                <div className="text-xs text-muted-foreground">Sources</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vessel, owner, port..."
                className="pl-9 h-9"
                value={filters.search ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <Select
              value={filters.report_date ?? "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, report_date: v === "all" ? undefined : v }))}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Report Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {dates.map((d) => (
                  <SelectItem key={d} value={d}>
                    {format(new Date(d + "T00:00:00"), "dd MMM yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.vessel_class ?? "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, vessel_class: v === "all" ? undefined : v }))}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map((c) => (
                  <SelectItem key={c} value={c!}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.open_region ?? "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, open_region: v === "all" ? undefined : v }))}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {uniqueRegions.map((r) => (
                  <SelectItem key={r} value={r!}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status ?? "all"}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? undefined : v }))}
            >
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="on_subs">On Subs</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="ballasting">Ballasting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grouped Table */}
          <div className="rounded-lg border overflow-auto max-h-[65vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs whitespace-nowrap">Vessel</TableHead>
                  <TableHead className="text-xs">Class</TableHead>
                  <TableHead className="text-xs">DWT</TableHead>
                  <TableHead className="text-xs">Built</TableHead>
                  <TableHead className="text-xs">Owner / Operator</TableHead>
                  <TableHead className="text-xs">Open Port</TableHead>
                  <TableHead className="text-xs">Region</TableHead>
                  <TableHead className="text-xs">Open Date</TableHead>
                  <TableHead className="text-xs">L3C</TableHead>
                  <TableHead className="text-xs">Coating</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs">Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      Loading positions...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      No positions found. Switch to Import & Scan to import position list emails.
                    </TableCell>
                  </TableRow>
                ) : (
                  CLASS_ORDER.map((cls) => {
                    const group = grouped.get(cls);
                    if (!group || group.length === 0) return null;
                    return [
                      // Class header row
                      <TableRow key={`hdr-${cls}`} className="bg-muted/60 hover:bg-muted/60">
                        <TableCell colSpan={13} className="py-1.5 px-3">
                          <span className="text-xs font-bold text-primary">
                            {cls}
                          </span>
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            {group.length}
                          </Badge>
                        </TableCell>
                      </TableRow>,
                      // Data rows
                      ...group.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-medium whitespace-nowrap">
                            {p.vessel_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${CLASS_COLORS[p.vessel_class ?? ""] ?? ""}`}>
                              {p.vessel_class ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs tabular-nums">
                            {p.dwt ? p.dwt.toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="text-xs">{p.built_year ?? "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {p.owner ?? "—"}
                            {p.operator && p.operator !== p.owner && (
                              <span className="text-muted-foreground"> / {p.operator}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{p.open_port ?? "—"}</TableCell>
                          <TableCell className="text-xs">{p.open_region ?? "—"}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {p.open_date_text ?? (p.open_date ? format(new Date(p.open_date + "T00:00:00"), "dd-MMM") : "—")}
                          </TableCell>
                          <TableCell className="text-xs uppercase">{p.cargo_history ?? "—"}</TableCell>
                          <TableCell className="text-xs">{p.coating ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[p.status ?? ""] ?? ""}`}>
                              {p.status ?? "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {p.source_name ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {p.comments ?? "—"}
                          </TableCell>
                        </TableRow>
                      )),
                    ];
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── IMPORT & SCAN TAB ──────────────────────────────── */}
        <TabsContent value="import" className="space-y-4 mt-4">
          {/* Gmail Auto-Scan */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Gmail Auto-Scan</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Scans your Gmail for position list emails from known owners/operators (Fearnleys, Heidmar, Maersk Tankers, Hafnia, etc.)
              and extracts vessel positions automatically via Claude AI.
            </p>
            <PositionScanPanel onScanComplete={() => { load(); setActiveTab("positions"); }} />
          </div>

          {/* Paste Email Text */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Paste Position List Email</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Copy-paste the body of a position list email below. Claude AI will extract all vessel positions.
            </p>
            <Textarea
              placeholder="Paste position list email text here..."
              className="min-h-[150px] font-mono text-xs"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className="flex items-center gap-3 mt-3">
              <Button
                size="sm"
                onClick={handleParseEmail}
                disabled={parsing || pasteText.length < 30}
                className="gap-2"
              >
                {parsing ? "Parsing..." : "Extract Positions"}
              </Button>
              {parseResult && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleImportParsed}
                  disabled={importing}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {importing ? "Importing..." : `Import ${parseResult.positions?.length ?? parseResult.count ?? 0} Positions`}
                </Button>
              )}
              {pasteText.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {pasteText.length.toLocaleString()} chars
                </span>
              )}
            </div>
          </div>

          {/* Preview extracted positions */}
          {parseResult && parseResult.positions && parseResult.positions.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">
                Preview: {parseResult.positions.length} positions from {parseResult.source_name ?? "unknown"}
              </h3>
              <div className="rounded-lg border overflow-auto max-h-[40vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Vessel</TableHead>
                      <TableHead className="text-xs">Class</TableHead>
                      <TableHead className="text-xs">Open Port</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.positions.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{p.vessel_name}</TableCell>
                        <TableCell className="text-xs">{p.vessel_class ?? "—"}</TableCell>
                        <TableCell className="text-xs">{p.open_port ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Manual Entry</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Add individual vessel positions manually.
            </p>
            <AddPositionDialog onAdded={() => { load(); setActiveTab("positions"); }} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
