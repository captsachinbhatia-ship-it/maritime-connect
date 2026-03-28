import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { FileText, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchReportHistory,
  type ReportSummary,
} from "@/services/marketData";

const SOURCE_LABELS: Record<string, string> = {
  meiwa_vlcc: "Meiwa VLCC",
  meiwa_dirty: "Meiwa Dirty",
  presco: "Presco",
  gibson: "Gibson",
  vantage_dpp: "Vantage DPP",
  eastport: "Eastport",
  alliance: "Alliance",
  unknown: "Unknown",
};

interface Props {
  refreshKey: number;
}

export function ReportHistoryTable({ refreshKey }: Props) {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchReportHistory();
    setReports(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No reports uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Uploaded Reports</h3>
          <Badge variant="secondary" className="text-xs">
            {reports.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="rounded-lg border overflow-auto max-h-[40vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Source</TableHead>
              <TableHead className="text-xs">File</TableHead>
              <TableHead className="text-xs">Report Date</TableHead>
              <TableHead className="text-xs">Fixtures</TableHead>
              <TableHead className="text-xs">Uploaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs">
                  <Badge variant="outline" className="text-[10px]">
                    {SOURCE_LABELS[r.report_source] ?? r.report_source}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {r.pdf_filename ?? "—"}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {format(new Date(r.report_date + "T00:00:00"), "d MMM yyyy")}
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {r.fixture_count}
                </TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {format(new Date(r.uploaded_at), "d MMM yyyy, HH:mm")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
