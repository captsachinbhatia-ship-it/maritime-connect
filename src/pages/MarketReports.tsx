import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  Upload,
  Loader2,
  AlertCircle,
  Search,
  SlidersHorizontal,
  FileUp,
  FileDown,
  Fuel,
  TableProperties,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useCrmUser } from "@/hooks/useCrmUser";
import {
  fetchMarketData,
  fetchResolutions,
  type MarketRecord,
  type MarketFixture,
  type Resolution,
} from "@/services/marketData";
import { FixtureTable } from "@/components/market-reports/FixtureTable";
import { BalticRoutesTable } from "@/components/market-reports/BalticRoutesTable";
import { BunkerPricesTable } from "@/components/market-reports/BunkerPricesTable";
import { UploadReportDialog } from "@/components/market-reports/UploadReportDialog";
import { ReportHistoryTable } from "@/components/market-reports/ReportHistoryTable";
import { ResolveDiscrepancyDialog } from "@/components/market-reports/ResolveDiscrepancyDialog";
import { generateMarketReportPdf } from "@/lib/generateMarketReportPdf";
import { mergeResolvedFixtures, type MergedFixture } from "@/lib/mergeResolvedFixtures";
import { detectDiscrepancies, type VesselDiscrepancy } from "@/lib/discrepancies";
import {
  VESSEL_CLASSES,
  VESSEL_CLASS_FILTER_OPTIONS,
  CARGO_TYPE_FILTER_OPTIONS,
  COATING_FILTER_OPTIONS,
} from "@/lib/marketConstants";
import {
  startOfWeek,
  endOfWeek,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  format as fmtDate,
} from "date-fns";

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "meiwa_vlcc", label: "Meiwa VLCC" },
  { value: "meiwa_dirty", label: "Meiwa Dirty" },
  { value: "presco", label: "Presco" },
  { value: "gibson", label: "Gibson" },
  { value: "vantage_dpp", label: "Vantage DPP" },
  { value: "eastport", label: "Eastport" },
  { value: "alliance", label: "Alliance" },
  { value: "bravo_tankers", label: "Bravo Tankers (Fixtures)" },
  { value: "bravo_rates", label: "Bravo Rates Grid" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "fixed", label: "Fixed" },
  { value: "on_subs", label: "On Subs" },
  { value: "reported", label: "Reported" },
  { value: "failed", label: "Failed" },
  { value: "withdrawn", label: "Withdrawn" },
];

// Date preset helpers
type DatePreset = { label: string; from: string; to: string };
function getDatePresets(): DatePreset[] {
  const today = new Date();
  const fmt = (d: Date) => fmtDate(d, "yyyy-MM-dd");
  return [
    { label: "Today", from: fmt(today), to: fmt(today) },
    { label: "This week", from: fmt(startOfWeek(today, { weekStartsOn: 1 })), to: fmt(endOfWeek(today, { weekStartsOn: 1 })) },
    { label: "Last 7 days", from: fmt(subDays(today, 6)), to: fmt(today) },
    { label: "This month", from: fmt(startOfMonth(today)), to: fmt(endOfMonth(today)) },
    { label: "Last month", from: fmt(startOfMonth(subMonths(today, 1))), to: fmt(endOfMonth(subMonths(today, 1))) },
  ];
}

// Dirty = Crude, DPP. Clean = CPP, Chemical, LPG, LNG, Vegetable Oil
const DIRTY_CARGO_TYPES = new Set(["Crude", "DPP"]);
const CLEAN_CARGO_TYPES = new Set(["CPP", "Chemical", "LPG", "LNG", "Vegetable Oil"]);

function classifyCargo(cargoType: string | null): "dirty" | "clean" | "other" {
  if (!cargoType) return "other";
  if (DIRTY_CARGO_TYPES.has(cargoType)) return "dirty";
  if (CLEAN_CARGO_TYPES.has(cargoType)) return "clean";
  return "other";
}

function uniqueValues(fixtures: MarketFixture[], field: keyof MarketFixture): string[] {
  const set = new Set<string>();
  for (const f of fixtures) {
    const v = f[field];
    if (v != null && String(v).trim()) set.add(String(v).trim());
  }
  return [...set].sort();
}

export default function MarketReports() {
  const { crmUserId, crmUser } = useCrmUser();

  // State
  const [fixtures, setFixtures] = useState<MarketFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("fixtures");
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<VesselDiscrepancy | null>(null);
  const [cargoTab, setCargoTab] = useState<"all" | "dirty" | "clean">("all");
  const [resolutions, setResolutions] = useState<Resolution[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVesselClass, setFilterVesselClass] = useState("all");
  const [filterCargoType, setFilterCargoType] = useState("all");
  const [filterLoadRegion, setFilterLoadRegion] = useState("all");
  const [filterDischRegion, setFilterDischRegion] = useState("all");
  const [filterLoadPort, setFilterLoadPort] = useState("all");
  const [filterDischPort, setFilterDischPort] = useState("all");
  const [filterVesselName, setFilterVesselName] = useState("all");
  const [filterCoating, setFilterCoating] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [laycanFrom, setLaycanFrom] = useState("");
  const [laycanTo, setLaycanTo] = useState("");
  const [dwtMin, setDwtMin] = useState("");
  const [dwtMax, setDwtMax] = useState("");
  const [qtyMin, setQtyMin] = useState("");
  const [qtyMax, setQtyMax] = useState("");

  const loadFixtures = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: { dateFrom?: string; dateTo?: string } = {};
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const { data, error: err } = await fetchMarketData(
      Object.keys(filters).length > 0 ? filters : undefined
    );
    if (err) {
      console.warn("[MarketReports] fetch error:", err);
      setError(err);
    } else {
      setFixtures(data ?? []);
    }
    // Fetch resolutions alongside
    fetchResolutions().then(({ data: res }) => setResolutions(res ?? []));
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  // Merge resolved discrepancies into single rows
  const mergedFixtures = useMemo(
    () => mergeResolvedFixtures(fixtures, resolutions),
    [fixtures, resolutions]
  );

  // Dynamic filter options (use merged)
  const loadRegions = useMemo(() => uniqueValues(mergedFixtures, "load_region"), [mergedFixtures]);
  const dischRegions = useMemo(() => uniqueValues(mergedFixtures, "discharge_region"), [mergedFixtures]);
  const loadPorts = useMemo(() => uniqueValues(mergedFixtures, "load_port"), [mergedFixtures]);
  const dischPorts = useMemo(() => uniqueValues(mergedFixtures, "discharge_port"), [mergedFixtures]);
  const vesselNames = useMemo(() => uniqueValues(mergedFixtures, "vessel_name"), [mergedFixtures]);

  const filtered = useMemo(() => {
    return mergedFixtures.filter((f) => {
      if (filterSource !== "all" && f.report_source !== filterSource) return false;
      if (filterStatus !== "all" && f.fixture_status !== filterStatus) return false;
      if (filterVesselClass !== "all" && f.vessel_class !== filterVesselClass) return false;
      if (filterCargoType !== "all" && f.cargo_type !== filterCargoType) return false;
      if (filterLoadRegion !== "all" && f.load_region !== filterLoadRegion) return false;
      if (filterDischRegion !== "all" && f.discharge_region !== filterDischRegion) return false;
      if (filterLoadPort !== "all" && f.load_port !== filterLoadPort) return false;
      if (filterDischPort !== "all" && f.discharge_port !== filterDischPort) return false;
      if (filterVesselName !== "all" && f.vessel_name !== filterVesselName) return false;
      if (filterCoating !== "all" && f.coating !== filterCoating) return false;
      if (laycanFrom && f.laycan_from && f.laycan_from < laycanFrom) return false;
      if (laycanTo && f.laycan_to && f.laycan_to > laycanTo) return false;
      if (dwtMin && f.dwt != null && f.dwt < Number(dwtMin)) return false;
      if (dwtMax && f.dwt != null && f.dwt > Number(dwtMax)) return false;
      if (qtyMin && f.quantity_mt != null && f.quantity_mt < Number(qtyMin)) return false;
      if (qtyMax && f.quantity_mt != null && f.quantity_mt > Number(qtyMax)) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const haystack = [
          f.vessel_name, f.charterer, f.cargo_grade, f.load_port,
          f.discharge_port, f.owner, f.broker, f.cargo_type,
          f.load_region, f.discharge_region,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [
    fixtures, filterSource, filterStatus, filterVesselClass, filterCargoType,
    filterLoadRegion, filterDischRegion, filterLoadPort, filterDischPort,
    filterVesselName, filterCoating, laycanFrom, laycanTo, dwtMin, dwtMax,
    qtyMin, qtyMax, searchTerm,
  ]);


  const { vesselDiscrepancies, fixtureFieldMap } = useMemo(
    () => detectDiscrepancies(fixtures),
    [fixtures]
  );

  // Split by record type
  const fixtureRecords = useMemo(() => filtered.filter((r) => r.record_type === "FIXTURE" || !r.record_type), [filtered]);
  const enquiryRecords = useMemo(() => filtered.filter((r) => r.record_type === "ENQUIRY"), [filtered]);
  const balticRecords = useMemo(() => fixtures.filter((r) => r.record_type === "BALTIC"), [fixtures]);
  const bunkerRecords = useMemo(() => fixtures.filter((r) => r.record_type === "BUNKER"), [fixtures]);

  // Apply quick filter + cargo tab (only to fixtures)
  const displayed = useMemo(() => {
    let result = fixtureRecords;
    if (quickFilter === "fixed") result = result.filter((f) => f.fixture_status === "fixed");
    if (quickFilter === "discrepancies") result = result.filter((f) => fixtureFieldMap.has(f.id));
    if (cargoTab === "dirty") result = result.filter((f) => classifyCargo(f.cargo_type) === "dirty");
    if (cargoTab === "clean") result = result.filter((f) => classifyCargo(f.cargo_type) === "clean");
    return result;
  }, [fixtureRecords, quickFilter, fixtureFieldMap, cargoTab]);

  // Regroup after quick filter
  const grouped = useMemo(() => {
    const map: Record<string, MarketFixture[]> = {};
    for (const cls of VESSEL_CLASSES) map[cls] = [];
    for (const f of displayed) {
      const cls = f.vessel_class ?? "Other";
      if (!map[cls]) map[cls] = [];
      map[cls].push(f);
    }
    return map;
  }, [displayed]);

  const totalFixtures = fixtureRecords.length;
  const displayedCount = displayed.length;
  const fixedCount = fixtureRecords.filter((f) => f.fixture_status === "fixed").length;
  const sourcesCount = new Set(fixtureRecords.map((f) => f.report_source)).size;
  const dateCount = new Set(fixtureRecords.map((f) => f.report_date)).size;
  const discrepancyFixtureCount = fixtureRecords.filter((f) => fixtureFieldMap.has(f.id)).length;
  const dirtyCount = fixtureRecords.filter((f) => classifyCargo(f.cargo_type) === "dirty").length;
  const cleanCount = fixtureRecords.filter((f) => classifyCargo(f.cargo_type) === "clean").length;

  const handleGeneratePdf = async (type: "DPP" | "CPP") => {
    const relevantRecords = fixtures.filter((r) => r.report_type === type);
    if (relevantRecords.length === 0) return;
    const latestDate = relevantRecords[0]?.report_date ?? new Date().toISOString().slice(0, 10);
    await generateMarketReportPdf({ reportType: type, reportDate: latestDate, records: relevantRecords, resolutions });
  };

  const toggleQuickFilter = (filter: string) => {
    setQuickFilter((prev) => (prev === filter ? null : filter));
  };

  const clearAll = () => {
    setQuickFilter(null);
    setCargoTab("all");
    setSearchTerm(""); setFilterSource("all"); setFilterStatus("all");
    setFilterVesselClass("all"); setFilterCargoType("all");
    setFilterLoadRegion("all"); setFilterDischRegion("all");
    setFilterLoadPort("all"); setFilterDischPort("all");
    setFilterVesselName("all"); setFilterCoating("all");
    setDateFrom(""); setDateTo(""); setLaycanFrom(""); setLaycanTo("");
    setDwtMin(""); setDwtMax(""); setQtyMin(""); setQtyMax("");
  };

  const hasActiveFilters =
    filterSource !== "all" || filterStatus !== "all" ||
    filterVesselClass !== "all" || filterCargoType !== "all" ||
    filterLoadRegion !== "all" || filterDischRegion !== "all" ||
    filterLoadPort !== "all" || filterDischPort !== "all" ||
    filterVesselName !== "all" || filterCoating !== "all" ||
    searchTerm !== "" || dateFrom !== "" || dateTo !== "" ||
    laycanFrom !== "" || laycanTo !== "" ||
    dwtMin !== "" || dwtMax !== "" || qtyMin !== "" || qtyMax !== "";

  const activeFilterCount = [
    filterSource !== "all", filterStatus !== "all",
    filterVesselClass !== "all", filterCargoType !== "all",
    filterLoadRegion !== "all", filterDischRegion !== "all",
    filterLoadPort !== "all", filterDischPort !== "all",
    filterVesselName !== "all", filterCoating !== "all",
    searchTerm !== "", dateFrom !== "" || dateTo !== "",
    laycanFrom !== "" || laycanTo !== "",
    dwtMin !== "" || dwtMax !== "", qtyMin !== "" || qtyMax !== "",
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-foreground">Market Reports</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="fixtures" className="gap-1.5">
            <TableProperties className="h-4 w-4" />
            Fixtures
            {totalFixtures > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                {totalFixtures}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5">
            <FileUp className="h-4 w-4" />
            Import
          </TabsTrigger>
        </TabsList>

        {/* ====== FIXTURES TAB ====== */}
        <TabsContent value="fixtures" className="space-y-4 mt-4">
          {/* Stats — clickable to quick-filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={quickFilter === null ? "secondary" : "outline"}
              className="text-xs cursor-pointer hover:bg-secondary/80"
              onClick={() => setQuickFilter(null)}
            >
              {totalFixtures} fixture{totalFixtures !== 1 ? "s" : ""}
              {quickFilter && ` (showing ${displayedCount})`}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs cursor-pointer",
                quickFilter === "fixed"
                  ? "bg-green-200 text-green-900 border-green-400"
                  : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              )}
              onClick={() => toggleQuickFilter("fixed")}
            >
              {fixedCount} fixed
            </Badge>
            <Badge variant="outline" className="text-xs">
              {sourcesCount} source{sourcesCount !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {dateCount} date{dateCount !== 1 ? "s" : ""}
            </Badge>
            {vesselDiscrepancies.size > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs cursor-pointer",
                  quickFilter === "discrepancies"
                    ? "bg-amber-200 text-amber-900 border-amber-400"
                    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                )}
                onClick={() => toggleQuickFilter("discrepancies")}
              >
                {discrepancyFixtureCount} discrepanc{vesselDiscrepancies.size === 1 ? "y" : "ies"}
              </Badge>
            )}
            {quickFilter && (
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={() => setQuickFilter(null)}>
                Clear
              </Button>
            )}
          </div>

          {/* Primary filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vessel, charterer, cargo, port…"
                className="pl-8 w-72 h-8 text-xs"
              />
            </div>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterVesselClass} onValueChange={setFilterVesselClass}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VESSEL_CLASS_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCargoType} onValueChange={setFilterCargoType}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CARGO_TYPE_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={showMoreFilters ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setShowMoreFilters((p) => !p)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              More
              {activeFilterCount > 5 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">
                  {activeFilterCount - 5}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearAll}>
                Clear all
              </Button>
            )}
          </div>

          {/* Expanded filters */}
          {showMoreFilters && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={filterVesselName} onValueChange={setFilterVesselName}>
                  <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Vessel Name" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vessels</SelectItem>
                    {vesselNames.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={filterLoadPort} onValueChange={setFilterLoadPort}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Load Port" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Load Ports</SelectItem>
                    {loadPorts.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={filterLoadRegion} onValueChange={setFilterLoadRegion}>
                  <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Load Region" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Load Regions</SelectItem>
                    {loadRegions.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={filterDischPort} onValueChange={setFilterDischPort}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Disch Port" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Disch Ports</SelectItem>
                    {dischPorts.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={filterDischRegion} onValueChange={setFilterDischRegion}>
                  <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Disch Region" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Disch Regions</SelectItem>
                    {dischRegions.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={filterCoating} onValueChange={setFilterCoating}>
                  <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Coating" /></SelectTrigger>
                  <SelectContent>
                    {COATING_FILTER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">Report date</span>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-32 h-8 text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-32 h-8 text-xs" />
                {getDatePresets().map((p) => (
                  <Button
                    key={p.label}
                    variant={dateFrom === p.from && dateTo === p.to ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-[10px] px-2"
                    onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
                  >
                    {p.label}
                  </Button>
                ))}
                {(dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">Laycan</span>
                <Input type="date" value={laycanFrom} onChange={(e) => setLaycanFrom(e.target.value)} className="w-32 h-8 text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={laycanTo} onChange={(e) => setLaycanTo(e.target.value)} className="w-32 h-8 text-xs" />
                {getDatePresets().map((p) => (
                  <Button
                    key={p.label}
                    variant={laycanFrom === p.from && laycanTo === p.to ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-[10px] px-2"
                    onClick={() => { setLaycanFrom(p.from); setLaycanTo(p.to); }}
                  >
                    {p.label}
                  </Button>
                ))}
                {(laycanFrom || laycanTo) && (
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => { setLaycanFrom(""); setLaycanTo(""); }}>
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">DWT</span>
                <Input type="number" value={dwtMin} onChange={(e) => setDwtMin(e.target.value)} placeholder="Min" className="w-28 h-8 text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="number" value={dwtMax} onChange={(e) => setDwtMax(e.target.value)} placeholder="Max" className="w-28 h-8 text-xs" />
                <span className="text-xs text-muted-foreground w-16 ml-2">Cargo MT</span>
                <Input type="number" value={qtyMin} onChange={(e) => setQtyMin(e.target.value)} placeholder="Min" className="w-28 h-8 text-xs" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="number" value={qtyMax} onChange={(e) => setQtyMax(e.target.value)} placeholder="Max" className="w-28 h-8 text-xs" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Dirty / Clean / All sub-tabs */}
          <div className="flex items-center gap-1 border-b">
            {([
              { key: "all" as const, label: "All", count: displayedCount },
              { key: "dirty" as const, label: "Dirty (Crude/DPP)", count: dirtyCount },
              { key: "clean" as const, label: "Clean (CPP/Chem/LPG)", count: cleanCount },
            ]).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setCargoTab(key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors",
                  cargoTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1.5">
                  {count}
                </Badge>
              </button>
            ))}
          </div>

          {/* Generate PDF buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => handleGeneratePdf("DPP")}
              disabled={fixtures.filter((r) => r.report_type === "DPP").length === 0}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download DPP Report
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => handleGeneratePdf("CPP")}
              disabled={fixtures.filter((r) => r.report_type === "CPP").length === 0}
            >
              <FileDown className="h-3.5 w-3.5" />
              Download CPP Report
            </Button>
          </div>

          {/* Baltic Routes */}
          {!loading && <BalticRoutesTable records={balticRecords} />}

          {/* Fixture tables */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayedCount === 0 && enquiryRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {hasActiveFilters || cargoTab !== "all"
                  ? "No fixtures match your filters."
                  : "No fixtures yet."}
              </p>
              <p className="text-xs mt-1">
                {hasActiveFilters || cargoTab !== "all"
                  ? "Try adjusting or clearing filters."
                  : "Go to the Import tab to upload broker reports."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Fixtures grouped by vessel class */}
              {[...VESSEL_CLASSES, "Other"].map(
                (cls) =>
                  grouped[cls] &&
                  grouped[cls].length > 0 && (
                    <FixtureTable
                      key={cls}
                      vesselClass={cls}
                      fixtures={grouped[cls]}
                      fixtureFieldMap={fixtureFieldMap}
                      vesselDiscrepancies={vesselDiscrepancies}
                      onResolve={setResolveTarget}
                    />
                  )
              )}

              {/* Enquiries section */}
              {enquiryRecords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Enquiries</h3>
                    <Badge variant="secondary" className="text-xs">{enquiryRecords.length}</Badge>
                  </div>
                  <div className="rounded-lg border overflow-auto max-h-[40vh]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-3 py-1.5 font-medium">Segment</th>
                          <th className="text-left px-3 py-1.5 font-medium">Charterer</th>
                          <th className="text-left px-3 py-1.5 font-medium">Qty (kt)</th>
                          <th className="text-left px-3 py-1.5 font-medium">Cargo</th>
                          <th className="text-left px-3 py-1.5 font-medium">Laycan</th>
                          <th className="text-left px-3 py-1.5 font-medium">Load</th>
                          <th className="text-left px-3 py-1.5 font-medium">Discharge</th>
                          <th className="text-left px-3 py-1.5 font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enquiryRecords.map((e) => (
                          <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-3 py-1.5">{e.vessel_class ?? "—"}</td>
                            <td className="px-3 py-1.5">{e.charterer ?? "—"}</td>
                            <td className="px-3 py-1.5 tabular-nums">{e.quantity_mt ? (e.quantity_mt / 1000).toFixed(0) : "—"}</td>
                            <td className="px-3 py-1.5 uppercase">{e.cargo_grade ?? e.cargo_type ?? "—"}</td>
                            <td className="px-3 py-1.5">{e.raw_text ?? "—"}</td>
                            <td className="px-3 py-1.5 uppercase">{e.load_port ?? "—"}</td>
                            <td className="px-3 py-1.5 uppercase">{e.discharge_port ?? "—"}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{e.source_broker ?? e.report_source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bunker Prices */}
          {!loading && <BunkerPricesTable records={bunkerRecords} />}
        </TabsContent>

        {/* ====== IMPORT TAB ====== */}
        <TabsContent value="import" className="space-y-6 mt-4">
          {/* Upload section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Upload Broker Reports</h2>
                <p className="text-sm text-muted-foreground">
                  Upload PDF, images, Word, Excel, or CSV files. Source and date are detected automatically.
                </p>
              </div>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Report
              </Button>
            </div>
          </div>

          {/* Bunker prices */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Bunker Prices</h2>
                <p className="text-sm text-muted-foreground">
                  Fetch today's bunker prices from Ship & Bunker (Fujairah, Singapore, Rotterdam, Houston).
                </p>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  const { fetchBunkerPrices } = await import("@/services/marketData");
                  const { inserted, skipped, error: err } = await fetchBunkerPrices();
                  if (err) {
                    toast({ title: "Bunker fetch failed", description: err, variant: "destructive" });
                  } else if (skipped) {
                    toast({ title: "Already fetched", description: "Bunker prices already imported today." });
                  } else {
                    toast({ title: "Bunker prices imported", description: `${inserted} port prices saved.` });
                    loadFixtures();
                  }
                }}
              >
                <Fuel className="h-4 w-4 mr-2" />
                Fetch Bunker Prices
              </Button>
            </div>
          </div>

          {/* Report history */}
          <ReportHistoryTable refreshKey={historyRefresh} />
        </TabsContent>
      </Tabs>

      {/* Upload dialog (accessible from both tabs) */}
      <UploadReportDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => {
          loadFixtures();
          setHistoryRefresh((p) => p + 1);
        }}
        uploadedBy={crmUserId}
      />

      {/* Resolve discrepancy dialog */}
      {resolveTarget && (
        <ResolveDiscrepancyDialog
          open={!!resolveTarget}
          onOpenChange={(o) => !o && setResolveTarget(null)}
          discrepancy={resolveTarget}
          reportDate={fixtures.find((f) => resolveTarget.fixtureIds.includes(f.id))?.report_date ?? ""}
          resolvedBy={crmUserId}
          resolvedByName={crmUser?.full_name ?? "Unknown"}
          onResolved={() => { loadFixtures(); fetchResolutions().then(({ data }) => setResolutions(data ?? [])); }}
        />
      )}
    </div>
  );
}
