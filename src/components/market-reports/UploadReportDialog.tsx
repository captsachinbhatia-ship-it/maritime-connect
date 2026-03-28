import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { uploadMarketReport } from "@/services/marketData";

const ACCEPTED_EXTENSIONS =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv";

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
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const unique = arr.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...unique];
    });
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
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

    setFiles([]);
    onOpenChange(false);
    onUploaded();
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) setFiles([]);
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Broker Reports</DialogTitle>
          <DialogDescription>
            Drag & drop or click to select report files. Source and date are
            detected automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <Upload
              className={cn(
                "h-8 w-8 mx-auto mb-2",
                dragging ? "text-primary" : "text-muted-foreground/50"
              )}
            />
            <p className="text-sm text-muted-foreground">
              {dragging
                ? "Drop files here"
                : "Drag & drop files here, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              PDF, Images, Word, Excel, CSV
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1 max-h-[30vh] overflow-auto">
              {files.map((file, i) => (
                <div
                  key={file.name + file.size}
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-muted-foreground shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  {!uploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      className="p-0.5 rounded hover:bg-muted shrink-0"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          {uploading && progress && (
            <p className="text-xs text-muted-foreground">{progress}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Parsing…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Parse ({files.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
