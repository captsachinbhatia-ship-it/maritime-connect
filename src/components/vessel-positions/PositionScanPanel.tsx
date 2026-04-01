import { useState } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { triggerPositionScan } from "@/services/vesselPositions";

interface Props {
  onScanComplete: () => void;
}

export function PositionScanPanel({ onScanComplete }: Props) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setResult(null);
    try {
      const res = await triggerPositionScan();
      setResult({
        success: true,
        message: (res as { message?: string }).message ?? "Scan triggered. New positions will appear shortly.",
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
    <Card className="border-dashed">
      <CardContent className="flex items-center gap-4 py-3 px-4">
        <Button
          size="sm"
          variant="outline"
          onClick={handleScan}
          disabled={scanning}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Triggering..." : "Scan Position Emails"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Scans Gmail for owner/operator position list emails and imports via Claude AI
        </span>
        {result && (
          <span className={`text-xs flex items-center gap-1 ${result.success ? "text-green-600" : "text-red-600"}`}>
            {result.success ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {result.message}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
