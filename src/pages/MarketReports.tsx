import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import {
  BarChart3,
  Upload,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
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
  fetchAvailableDates,
  type MarketFixture,
} from "@/services/marketData";
import { FixtureTable } from "@/components/market-reports/FixtureTable";
import { UploadReportDialog } from "@/components/market-reports/UploadReportDialog";

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

export default function MarketReports() {
  const { crmUserId } = useCrmUser();

  // State
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [fixtures, setFixtures] = useState<MarketFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch available dates on mount
  useEffect(() => {
    fetchAvailableDates().then(({ data }) => {
      if (data) setAvailableDates(data);
    });
  }, []);

  // Fetch fixtures for selected date
  const loadFixtures = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await fetchMarketData(selectedDate);
    if (err) {
      console.warn("[MarketReports] fetch error:", err);
      setError(err);
    } else {
      setFixtures(data ?? []);
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  // Date navigation
  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  // Filtered fixtures
  const filtered = useMemo(() => {
    return fixtures.filter((f) => {
      if (filterSource !== "all" && f.report_source !== filterSource)
        return false;
      if (filterStatus !== "all" && f.fixture_status !== filterStatus)
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
  }, [fixtures, filterSource, filterStatus, searchTerm]);

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

  // Stats
  const totalFixtures = filtered.length;
  const fixedCount = filtered.filter(
    (f) => f.fixture_status === "fixed"
  ).length;
  const sourcesCount = new Set(filtered.map((f) => f.report_source)).size;

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

      {/* Date picker + navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-40"
        />
        <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground ml-2">
          {format(new Date(selectedDate + "T00:00:00"), "EEEE, d MMMM yyyy")}
        </span>
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
          <p className="text-sm">No fixtures for this date.</p>
          <p className="text-xs mt-1">
            Upload a broker report to get started.
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
                />
              )
          )}
          {/* Show "Other" if any fixtures don't match known classes */}
          {grouped["Other"] && grouped["Other"].length > 0 && (
            <FixtureTable vesselClass="Other" fixtures={grouped["Other"]} />
          )}
        </div>
      )}

      {/* Upload dialog */}
      <UploadReportDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={loadFixtures}
        uploadedBy={crmUserId}
      />
    </div>
  );
}
