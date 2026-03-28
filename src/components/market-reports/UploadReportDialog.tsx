import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, X, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
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

type FileStatus = "pending" | "processing" | "success" | "error";

interface FileEntry {
  file: File;
  status: FileStatus;
  message: string;
  inserted: number;
}

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
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    setEntries((prev) => {
      const existing = new Set(prev.map((e) => e.file.name + e.file.size));
      const unique = arr
        .filter((f) => !existing.has(f.name + f.size))
        .map((f) => ({
          file: f,
          status: "pending" as FileStatus,
          message: "",
          inserted: 0,
        }));
      return [...prev, ...unique];
    });
    setDone(false);
  }, []);

  const removeFile = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    const pending = entries.filter((e) => e.status === "pending" || e.status === "error");
    if (pending.length === 0) return;
    setUploading(true);
    setDone(false);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.status !== "pending" && entry.status !== "error") continue;

      // Mark as processing
      setEntries((prev) =>
        prev.map((e, idx) =>
          idx === i ? { ...e, status: "processing" as FileStatus, message: "Sending to Claude…" } : e
        )
      );

      try {
        const { inserted, skipped, reportSource, reportDate, error } =
          await uploadMarketReport(entry.file, uploadedBy);

        if (error) {
          setEntries((prev) =>
            prev.map((e, idx) =>
              idx === i ? { ...e, status: "error" as FileStatus, message: error } : e
            )
          );
        } else {
          const skipNote = skipped > 0 ? `, ${skipped} skipped` : "";
          setEntries((prev) =>
            prev.map((e, idx) =>
              idx === i
                ? {
                    ...e,
                    status: "success" as FileStatus,
                    inserted,
                    message: `${inserted} fixtures${skipNote} — ${reportSource ?? "unknown"}, ${reportDate ?? "unknown"}`,
                  }
                : e
            )
          );
        }
      } catch (err) {
        setEntries((prev) =>
          prev.map((e, idx) =>
            idx === i
              ? {
                  ...e,
                  status: "error" as FileStatus,
                  message: err instanceof Error ? err.message : "Unknown error",
                }
              : e
          )
        );
      }
    }

    setUploading(false);
    setDone(true);
    onUploaded();

    const successCount = entries.filter((e) => e.status === "success" || e.inserted > 0).length;
    // We read final state after loop — need to recount from latest
    // Toast is informational; detailed status is in the dialog
    toast({
      title: "Upload complete",
      description: `Processed ${entries.length} file${entries.length !== 1 ? "s" : ""}. Check dialog for details.`,
    });
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && !uploading) {
      setEntries([]);
      setDone(false);
    }
    if (!uploading) onOpenChange(isOpen);
  };

  const pendingCount = entries.filter((e) => e.status === "pending" || e.status === "error").length;
  const successCount = entries.filter((e) => e.status === "success").length;
  const errorCount = entries.filter((e) => e.status === "error").length;

  const StatusIcon = ({ status }: { status: FileStatus }) => {
    switch (status) {
      case "processing":
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />;
      case "success":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />;
      case "error":
        return <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Broker Reports</DialogTitle>
          <DialogDescription>
            Drag & drop or click to select. Source and date are detected automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Drop zone */}
          {!uploading && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            >
              <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Drag & drop files here, or click to browse
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
          )}

          {/* File list with status */}
          {entries.length > 0 && (
            <div className="space-y-1 max-h-[40vh] overflow-auto">
              {entries.map((entry, i) => (
                <div
                  key={entry.file.name + entry.file.size}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
                    entry.status === "error" && "border-red-200 bg-red-50/50",
                    entry.status === "success" && "border-green-200 bg-green-50/50",
                    entry.status === "processing" && "border-blue-200 bg-blue-50/50"
                  )}
                >
                  <StatusIcon status={entry.status} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{entry.file.name}</p>
                    {entry.message && (
                      <p
                        className={cn(
                          "text-[10px] truncate",
                          entry.status === "error"
                            ? "text-red-600"
                            : "text-muted-foreground"
                        )}
                      >
                        {entry.message}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0">
                    {(entry.file.size / 1024).toFixed(0)} KB
                  </span>
                  {!uploading && entry.status === "pending" && (
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

          {/* Summary after completion */}
          {done && (
            <div className="flex items-center gap-3 text-xs">
              {successCount > 0 && (
                <span className="text-green-600">{successCount} succeeded</span>
              )}
              {errorCount > 0 && (
                <span className="text-red-600">{errorCount} failed</span>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {done && errorCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpload}
            >
              Retry failed ({errorCount})
            </Button>
          )}
          <Button
            onClick={done ? () => handleClose(false) : handleUpload}
            disabled={entries.length === 0 || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing…
              </>
            ) : done ? (
              "Done"
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Parse ({pendingCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
