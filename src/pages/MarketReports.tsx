import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart3,
  Upload,
  Loader2,
  AlertCircle,
  Search,
  X,
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

const VESSEL_CLASSES = ["VLCC", "Suezmax", "Aframax", "LR2", "LR1", "MR"];

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

const VESSEL_CLASS_OPTIONS = [
  { value: "all", label: "All Vessel Types" },
  ...VESSEL_CLASSES.map((c) => ({ value: c, label: c })),
];

export default function MarketReports() {
  const { crmUserId } = useCrmUser();

  // State
  const [fixtures, setFixtures] = useState<MarketFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVesselClass, setFilterVesselClass] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  // Clear date range
  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
  };

  // Filtered fixtures
  const filtered = useMemo(() => {
    return fixtures.filter((f) => {
      if (filterSource !== "all" && f.report_source !== filterSource)
        return false;
      if (filterStatus !== "all" && f.fixture_status !== filterStatus)
        return false;
      if (
        filterVesselClass !== "all" &&
        f.vessel_class !== filterVesselClass
      )
        return false;
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
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(s)) return false;
      }
      return true;
    });
  }, [fixtures, filterSource, filterStatus, filterVesselClass, searchTerm]);

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

  const hasActiveFilters =
    filterSource !== "all" ||
    filterStatus !== "all" ||
    filterVesselClass !== "all" ||
    searchTerm !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search vessel, charterer, cargo…"
            className="pl-8 w-64 h-8 text-xs"
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
            {VESSEL_CLASS_OPTIONS.map((o) => (
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
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className="w-32 h-8 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className="w-32 h-8 text-xs"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearDateRange}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setSearchTerm("");
              setFilterSource("all");
              setFilterStatus("all");
              setFilterVesselClass("all");
              setDateFrom("");
              setDateTo("");
            }}
          >
            Clear all
          </Button>
        )}
      </div>

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
