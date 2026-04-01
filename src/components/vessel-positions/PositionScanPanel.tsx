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
        message: `Scan triggered successfully. ${JSON.stringify(res.result ?? {}).slice(0, 120)}`,
      });
      onScanComplete();
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
          {scanning ? "Scanning..." : "Scan Position Emails"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Scans Gmail for owner/operator position list emails and imports via Claude AI
        </span>
        {result && (
          <span className={`text-xs flex items-center gap-1 ${result.success ? "text-green-600" : "text-red-600"}`}>
            {result.success ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {result.message.slice(0, 80)}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
