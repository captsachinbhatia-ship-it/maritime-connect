import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { resolveDiscrepancy } from "@/services/marketData";
import type { VesselDiscrepancy } from "@/lib/discrepancies";

const SOURCE_LABELS: Record<string, string> = {
  meiwa_vlcc: "Meiwa VLCC", meiwa_dirty: "Meiwa Dirty",
  presco: "Presco", gibson: "Gibson", vantage_dpp: "Vantage DPP",
  eastport: "Eastport", yamamoto: "Yamamoto", alliance: "Alliance",
};

const FIELD_LABELS: Record<string, string> = {
  charterer: "Charterer", cargo_grade: "Cargo",
  quantity_mt: "Quantity (MT)",
  load_port: "Load Port", discharge_port: "Discharge Port",
  rate_value: "Rate", rate_numeric: "Rate (numeric)",
  fixture_status: "Status",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discrepancy: VesselDiscrepancy;
  reportDate: string;
  resolvedBy: string | null;
  resolvedByName: string;
  onResolved: () => void;
}

export function ResolveDiscrepancyDialog({
  open, onOpenChange, discrepancy, reportDate,
  resolvedBy, resolvedByName, onResolved,
}: Props) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [useCustom, setUseCustom] = useState<Record<string, boolean>>({});
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const fieldsToResolve = discrepancy.fields.filter(
      (f) => selections[f.field] || displayNames[f.field]
    );
    if (fieldsToResolve.length === 0 && !remark.trim()) {
      toast({ title: "Nothing to resolve", description: "Select a value, set a display name, or add a remark.", variant: "destructive" });
      return;
    }

    setSaving(true);

    for (const fd of fieldsToResolve) {
      const { error } = await resolveDiscrepancy({
        vesselName: discrepancy.vesselKey,
        reportDate,
        fieldName: fd.field,
        resolvedValue: selections[fd.field] ?? null,
        displayName: displayNames[fd.field]?.trim() || null,
        remark: remark.trim(),
        resolvedBy,
        resolvedByName,
      });
      if (error) {
        toast({ title: "Error saving", description: error, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    if (fieldsToResolve.length === 0 && remark.trim()) {
      const { error } = await resolveDiscrepancy({
        vesselName: discrepancy.vesselKey,
        reportDate,
        fieldName: "_remark",
        resolvedValue: null,
        displayName: null,
        remark: remark.trim(),
        resolvedBy,
        resolvedByName,
      });
      if (error) {
        toast({ title: "Error saving remark", description: error, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast({ title: "Discrepancy resolved", description: `${discrepancy.vesselKey} — by ${resolvedByName}` });
    setSelections({});
    setDisplayNames({});
    setCustomValues({});
    setUseCustom({});
    setRemark("");
    onOpenChange(false);
    onResolved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Resolve — {discrepancy.vesselKey}</DialogTitle>
          <DialogDescription>
            Pick the correct value, then set how it should appear in the PDF report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {discrepancy.fields.map((fd) => {
            const label = FIELD_LABELS[fd.field] ?? fd.field.replace(/_/g, " ");
            return (
              <div key={fd.field} className="space-y-2 rounded-lg border p-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </Label>

                {/* Source values as radio buttons */}
                <RadioGroup
                  value={useCustom[fd.field] ? "__custom__" : (selections[fd.field] ?? "")}
                  onValueChange={(val) => {
                    if (val === "__custom__") {
                      setUseCustom((prev) => ({ ...prev, [fd.field]: true }));
                      setSelections((prev) => ({ ...prev, [fd.field]: customValues[fd.field] ?? "" }));
                      setDisplayNames((prev) => ({ ...prev, [fd.field]: customValues[fd.field] ?? "" }));
                    } else {
                      setUseCustom((prev) => ({ ...prev, [fd.field]: false }));
                      setSelections((prev) => ({ ...prev, [fd.field]: val }));
                      if (!displayNames[fd.field] || useCustom[fd.field]) {
                        setDisplayNames((prev) => ({ ...prev, [fd.field]: val }));
                      }
                    }
                  }}
                  className="space-y-1"
                >
                  {Object.entries(fd.values).map(([src, val]) => (
                    <div
                      key={src}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer",
                        !useCustom[fd.field] && selections[fd.field] === String(val ?? "")
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem value={String(val ?? "")} id={`${fd.field}-${src}`} />
                      <label htmlFor={`${fd.field}-${src}`} className="flex-1 text-xs cursor-pointer">
                        <Badge variant="outline" className="text-[10px] mr-2">
                          {SOURCE_LABELS[src] ?? src}
                        </Badge>
                        <span className="font-mono">{val ?? "—"}</span>
                      </label>
                    </div>
                  ))}

                  {/* Custom value option */}
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-1.5 cursor-pointer",
                      useCustom[fd.field]
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:bg-muted/50"
                    )}
                  >
                    <RadioGroupItem value="__custom__" id={`${fd.field}-custom`} />
                    <label htmlFor={`${fd.field}-custom`} className="flex-1 text-xs cursor-pointer">
                      <Badge variant="outline" className="text-[10px] mr-2 bg-blue-50 text-blue-700 border-blue-200">
                        Custom
                      </Badge>
                      <span className="text-muted-foreground">Enter your own value</span>
                    </label>
                  </div>
                </RadioGroup>

                {/* Custom value input — only shown when Custom is selected */}
                {useCustom[fd.field] && (
                  <div className="ml-6 mt-1">
                    <Input
                      value={customValues[fd.field] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCustomValues((prev) => ({ ...prev, [fd.field]: v }));
                        setSelections((prev) => ({ ...prev, [fd.field]: v }));
                        setDisplayNames((prev) => ({ ...prev, [fd.field]: v }));
                      }}
                      placeholder="Type your own value for this field…"
                      className="h-7 text-xs"
                      autoFocus
                    />
                  </div>
                )}

                {/* Display name for PDF — shown when a source option is picked */}
                {!useCustom[fd.field] && selections[fd.field] && (
                  <div className="flex items-center gap-2 mt-2">
                    <Label className="text-[10px] text-muted-foreground whitespace-nowrap">
                      Display in PDF as:
                    </Label>
                    <Input
                      value={displayNames[fd.field] ?? ""}
                      onChange={(e) =>
                        setDisplayNames((prev) => ({ ...prev, [fd.field]: e.target.value }))
                      }
                      placeholder={selections[fd.field] || "e.g. South Korea, Singapore..."}
                      className="h-7 text-xs flex-1"
                    />
                  </div>
                )}
                {!useCustom[fd.field] && displayNames[fd.field] && selections[fd.field] && displayNames[fd.field] !== selections[fd.field] && (
                  <p className="text-[10px] text-muted-foreground">
                    Source says <span className="font-mono">"{selections[fd.field]}"</span> → PDF will show <span className="font-mono font-semibold">"{displayNames[fd.field]}"</span>
                  </p>
                )}
              </div>
            );
          })}

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Remark</Label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional note…"
              className="text-xs h-14"
            />
          </div>

          <p className="text-[10px] text-muted-foreground">
            Resolved by: <span className="font-medium">{resolvedByName}</span>
          </p>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Save Resolution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
