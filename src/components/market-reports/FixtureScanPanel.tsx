import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";

interface Props {
  onScanComplete: () => void;
}

export function FixtureScanPanel({ onScanComplete }: Props) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("trigger-gmail-scan", {
        body: { trigger: "crm_scan_now" },
      });
      if (error) throw error;

      setResult({
        success: true,
        message: data?.message ?? "Scan triggered. New fixtures will appear shortly.",
      });
      // Refresh data after a short delay to catch early results
      setTimeout(onScanComplete, 5000);
    } catch (err) {
      setResult({
        success: false,
        message: `Scan failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Scan Fixture Emails</h2>
        <p className="text-sm text-muted-foreground">
          Scans Gmail for fixture report emails from known brokers (Aramaritime, GB Line, Optima, Byzantium, Fearnleys, etc.)
          and extracts fixtures automatically via Claude AI.
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-4 py-3 px-4">
          <Button
            size="sm"
            variant="outline"
            onClick={handleScan}
            disabled={scanning}
            className="gap-2"
          >
            {scanning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {scanning ? "Triggering..." : "Scan Now"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Pulls fixture reports from the last 2 days
          </span>
          {result && (
            <span className={`text-xs flex items-center gap-1 ${result.success ? "text-green-600" : "text-red-600"}`}>
              {result.success ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {result.message}
            </span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
