import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { uploadMarketReport } from "@/services/marketData";

const REPORT_SOURCES = [
  { value: "meiwa_vlcc", label: "Meiwa VLCC" },
  { value: "meiwa_dirty", label: "Meiwa Dirty" },
  { value: "presco", label: "Presco" },
  { value: "gibson", label: "Gibson" },
  { value: "vantage_dpp", label: "Vantage DPP" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
  uploadedBy: string | null;
}

export function UploadReportDialog({
  open,
  onOpenChange,
  onUploaded,
  uploadedBy,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !source || !date) return;
    setUploading(true);

    const { inserted, error } = await uploadMarketReport(
      file,
      source,
      date,
      uploadedBy
    );

    setUploading(false);

    if (error) {
      toast({
        title: "Upload failed",
        description: error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Report parsed",
      description: `${inserted} fixture${inserted !== 1 ? "s" : ""} extracted and saved.`,
    });

    setFile(null);
    setSource("");
    onOpenChange(false);
    onUploaded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Broker Report</DialogTitle>
          <DialogDescription>
            Upload a daily PDF report. Fixtures will be extracted automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Report Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select report…" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Report Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>PDF File</Label>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={!file || !source || !date || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Parsing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Parse
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
