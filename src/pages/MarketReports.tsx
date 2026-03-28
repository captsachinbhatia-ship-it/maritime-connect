import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  Upload,
  Loader2,
  AlertCircle,
  Search,
  X,
  SlidersHorizontal,
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
import { useCrmUser } from "@/hooks/useCrmUser";
import {
  fetchMarketData,
  type MarketFixture,
} from "@/services/marketData";
import { FixtureTable } from "@/components/market-reports/FixtureTable";
import { UploadReportDialog } from "@/components/market-reports/UploadReportDialog";
import { ReportHistoryTable } from "@/components/market-reports/ReportHistoryTable";
import { detectDiscrepancies } from "@/lib/discrepancies";
import {
  VESSEL_CLASSES,
  VESSEL_CLASS_FILTER_OPTIONS,
  CARGO_TYPE_FILTER_OPTIONS,
  COATING_FILTER_OPTIONS,
} from "@/lib/marketConstants";

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "meiwa_vlcc", label: "Meiwa VLCC" },
  { value: "meiwa_dirty", label: "Meiwa Dirty" },
  { value: "presco", label: "Presco" },
  { value: "gibson", label: "Gibson" },
  { value: "vantage_dpp", label: "Vantage DPP" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "fixed", label: "Fixed" },
  { value: "on_subs", label: "On Subs" },
  { value: "reported", label: "Reported" },
  { value: "failed", label: "Failed" },
  { value: "withdrawn", label: "Withdrawn" },
];

/** Extract unique non-null values from fixtures for a given field */
function uniqueValues(fixtures: MarketFixture[], field: keyof MarketFixture): string[] {
  const set = new Set<string>();
  for (const f of fixtures) {
    const v = f[field];
    if (v != null && String(v).trim()) set.add(String(v).trim());
  }
  return [...set].sort();
}

export default function MarketReports() {
  const { crmUserId } = useCrmUser();

  // State
  const [fixtures, setFixtures] = useState<MarketFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

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

  // Fetch all fixtures (with optional date range)
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
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  // Dynamic filter options derived from loaded data
  const loadRegions = useMemo(() => uniqueValues(fixtures, "load_region"), [fixtures]);
  const dischRegions = useMemo(() => uniqueValues(fixtures, "discharge_region"), [fixtures]);
  const loadPorts = useMemo(() => uniqueValues(fixtures, "load_port"), [fixtures]);
  const dischPorts = useMemo(() => uniqueValues(fixtures, "discharge_port"), [fixtures]);
  const vesselNames = useMemo(() => uniqueValues(fixtures, "vessel_name"), [fixtures]);

  // Filtered fixtures
  const filtered = useMemo(() => {
    return fixtures.filter((f) => {
      if (filterSource !== "all" && f.report_source !== filterSource)
        return false;
      if (filterStatus !== "all" && f.fixture_status !== filterStatus)
        return false;
      if (filterVesselClass !== "all" && f.vessel_class !== filterVesselClass)
        return false;
      if (filterCargoType !== "all" && f.cargo_type !== filterCargoType)
        return false;
      if (filterLoadRegion !== "all" && f.load_region !== filterLoadRegion)
        return false;
      if (filterDischRegion !== "all" && f.discharge_region !== filterDischRegion)
        return false;
      if (filterLoadPort !== "all" && f.load_port !== filterLoadPort)
        return false;
      if (filterDischPort !== "all" && f.discharge_port !== filterDischPort)
        return false;
      if (filterVesselName !== "all" && f.vessel_name !== filterVesselName)
        return false;
      if (filterCoating !== "all" && f.coating !== filterCoating)
        return false;

      // Laycan date range
      if (laycanFrom && f.laycan_from && f.laycan_from < laycanFrom)
        return false;
      if (laycanTo && f.laycan_to && f.laycan_to > laycanTo)
        return false;

      // DWT range
      if (dwtMin && f.dwt != null && f.dwt < Number(dwtMin))
        return false;
      if (dwtMax && f.dwt != null && f.dwt > Number(dwtMax))
        return false;

      // Cargo quantity range
      if (qtyMin && f.quantity_mt != null && f.quantity_mt < Number(qtyMin))
        return false;
      if (qtyMax && f.quantity_mt != null && f.quantity_mt > Number(qtyMax))
        return false;

      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const haystack = [
          f.vessel_name,
          f.charterer,
          f.cargo_grade,
          f.load_port,
          f.discharge_port,
          f.owner,
          f.broker,
          f.cargo_type,
          f.load_region,
          f.discharge_region,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
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

  // Group by vessel class
  const grouped = useMemo(() => {
    const map: Record<string, MarketFixture[]> = {};
    for (const cls of VESSEL_CLASSES) {
      map[cls] = [];
    }
    for (const f of filtered) {
      const cls = f.vessel_class ?? "Other";
      if (!map[cls]) map[cls] = [];
      map[cls].push(f);
    }
    return map;
  }, [filtered]);

  // Discrepancies (computed on all fixtures, not filtered)
  const { vesselDiscrepancies, fixtureFieldMap } = useMemo(
    () => detectDiscrepancies(fixtures),
    [fixtures]
  );

  // Stats
  const totalFixtures = filtered.length;
  const fixedCount = filtered.filter(
    (f) => f.fixture_status === "fixed"
  ).length;
  const sourcesCount = new Set(filtered.map((f) => f.report_source)).size;
  const dateCount = new Set(filtered.map((f) => f.report_date)).size;

  const clearAll = () => {
    setSearchTerm("");
    setFilterSource("all");
    setFilterStatus("all");
    setFilterVesselClass("all");
    setFilterCargoType("all");
    setFilterLoadRegion("all");
    setFilterDischRegion("all");
    setFilterLoadPort("all");
    setFilterDischPort("all");
    setFilterVesselName("all");
    setFilterCoating("all");
    setDateFrom("");
    setDateTo("");
    setLaycanFrom("");
    setLaycanTo("");
    setDwtMin("");
    setDwtMax("");
    setQtyMin("");
    setQtyMax("");
  };

  const hasActiveFilters =
    filterSource !== "all" ||
    filterStatus !== "all" ||
    filterVesselClass !== "all" ||
    filterCargoType !== "all" ||
    filterLoadRegion !== "all" ||
    filterDischRegion !== "all" ||
    filterLoadPort !== "all" ||
    filterDischPort !== "all" ||
    filterVesselName !== "all" ||
    filterCoating !== "all" ||
    searchTerm !== "" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    laycanFrom !== "" ||
    laycanTo !== "" ||
    dwtMin !== "" ||
    dwtMax !== "" ||
    qtyMin !== "" ||
    qtyMax !== "";

  const activeFilterCount = [
    filterSource !== "all",
    filterStatus !== "all",
    filterVesselClass !== "all",
    filterCargoType !== "all",
    filterLoadRegion !== "all",
    filterDischRegion !== "all",
    filterLoadPort !== "all",
    filterDischPort !== "all",
    filterVesselName !== "all",
    filterCoating !== "all",
    searchTerm !== "",
    dateFrom !== "" || dateTo !== "",
    laycanFrom !== "" || laycanTo !== "",
    dwtMin !== "" || dwtMax !== "",
    qtyMin !== "" || qtyMax !== "",
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <h1 className="text-2xl font-bold text-foreground">
            Market Reports
          </h1>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Report
        </Button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-xs">
          {totalFixtures} fixture{totalFixtures !== 1 ? "s" : ""}
        </Badge>
        <Badge
          variant="outline"
          className="text-xs bg-green-50 text-green-700 border-green-200"
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
            className="text-xs bg-amber-50 text-amber-700 border-amber-200"
          >
            {vesselDiscrepancies.size} discrepanc
            {vesselDiscrepancies.size === 1 ? "y" : "ies"}
          </Badge>
        )}
      </div>

      {/* Primary filters row */}
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
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterVesselClass} onValueChange={setFilterVesselClass}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VESSEL_CLASS_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCargoType} onValueChange={setFilterCargoType}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CARGO_TYPE_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={clearAll}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Expanded filters */}
      {showMoreFilters && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          {/* Row 1: Vessel, Load/Discharge ports and regions */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterVesselName} onValueChange={setFilterVesselName}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Vessel Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vessels</SelectItem>
                {vesselNames.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLoadPort} onValueChange={setFilterLoadPort}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Load Port" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Load Ports</SelectItem>
                {loadPorts.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLoadRegion} onValueChange={setFilterLoadRegion}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Load Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Load Regions</SelectItem>
                {loadRegions.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDischPort} onValueChange={setFilterDischPort}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="Disch Port" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disch Ports</SelectItem>
                {dischPorts.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDischRegion} onValueChange={setFilterDischRegion}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Disch Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Disch Regions</SelectItem>
                {dischRegions.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCoating} onValueChange={setFilterCoating}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Coating" />
              </SelectTrigger>
              <SelectContent>
                {COATING_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Date ranges, DWT, Quantity */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground w-20">Report date</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-32 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-32 h-8 text-xs"
            />

            <span className="text-xs text-muted-foreground w-16 ml-2">Laycan</span>
            <Input
              type="date"
              value={laycanFrom}
              onChange={(e) => setLaycanFrom(e.target.value)}
              className="w-32 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={laycanTo}
              onChange={(e) => setLaycanTo(e.target.value)}
              className="w-32 h-8 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground w-20">DWT</span>
            <Input
              type="number"
              value={dwtMin}
              onChange={(e) => setDwtMin(e.target.value)}
              placeholder="Min"
              className="w-28 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="number"
              value={dwtMax}
              onChange={(e) => setDwtMax(e.target.value)}
              placeholder="Max"
              className="w-28 h-8 text-xs"
            />

            <span className="text-xs text-muted-foreground w-16 ml-2">Cargo MT</span>
            <Input
              type="number"
              value={qtyMin}
              onChange={(e) => setQtyMin(e.target.value)}
              placeholder="Min"
              className="w-28 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="number"
              value={qtyMax}
              onChange={(e) => setQtyMax(e.target.value)}
              placeholder="Max"
              className="w-28 h-8 text-xs"
            />
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

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : totalFixtures === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {hasActiveFilters
              ? "No fixtures match your filters."
              : "No fixtures yet."}
          </p>
          <p className="text-xs mt-1">
            {hasActiveFilters
              ? "Try adjusting or clearing filters."
              : "Upload a broker report to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {VESSEL_CLASSES.map(
            (cls) =>
              grouped[cls] &&
              grouped[cls].length > 0 && (
                <FixtureTable
                  key={cls}
                  vesselClass={cls}
                  fixtures={grouped[cls]}
                  fixtureFieldMap={fixtureFieldMap}
                  vesselDiscrepancies={vesselDiscrepancies}
                />
              )
          )}
          {grouped["Other"] && grouped["Other"].length > 0 && (
            <FixtureTable
              vesselClass="Other"
              fixtures={grouped["Other"]}
              fixtureFieldMap={fixtureFieldMap}
              vesselDiscrepancies={vesselDiscrepancies}
            />
          )}
        </div>
      )}

      {/* Report history */}
      <ReportHistoryTable refreshKey={historyRefresh} />

      {/* Upload dialog */}
      <UploadReportDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => {
          loadFixtures();
          setHistoryRefresh((p) => p + 1);
        }}
        uploadedBy={crmUserId}
      />
    </div>
  );
}
