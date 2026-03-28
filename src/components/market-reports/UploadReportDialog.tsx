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
import { toast } from "@/hooks/use-toast";
import { uploadMarketReport } from "@/services/marketData";

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
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    setUploading(true);

    let totalInserted = 0;
    const results: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`Processing ${i + 1} of ${files.length}: ${file.name}…`);

      const { inserted, skipped, reportSource, reportDate, error } =
        await uploadMarketReport(file, uploadedBy);

      if (error) {
        results.push(`${file.name}: failed — ${error}`);
      } else {
        totalInserted += inserted;
        const skipNote = skipped > 0 ? `, ${skipped} duplicates skipped` : "";
        results.push(
          `${file.name}: ${inserted} new fixtures${skipNote} (${reportSource}, ${reportDate})`
        );
      }
    }

    setUploading(false);
    setProgress("");

    if (totalInserted > 0) {
      toast({
        title: "Reports parsed",
        description: `${totalInserted} fixture${totalInserted !== 1 ? "s" : ""} extracted from ${files.length} file${files.length !== 1 ? "s" : ""}.`,
      });
    } else {
      toast({
        title: "No fixtures extracted",
        description: results.join("\n"),
        variant: "destructive",
      });
    }

    setFiles(null);
    onOpenChange(false);
    onUploaded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Broker Reports</DialogTitle>
          <DialogDescription>
            Drop one or more PDF reports. Source and date are detected
            automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>PDF Files</Label>
            <Input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => setFiles(e.target.files)}
            />
          </div>
          {uploading && progress && (
            <p className="text-xs text-muted-foreground">{progress}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={!files || files.length === 0 || uploading}
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
