import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { resolveDiscrepancy } from "@/services/marketData";
import type { VesselDiscrepancy } from "@/lib/discrepancies";

const SOURCE_LABELS: Record<string, string> = {
  meiwa_vlcc: "Meiwa VLCC",
  meiwa_dirty: "Meiwa Dirty",
  presco: "Presco",
  gibson: "Gibson",
  vantage_dpp: "Vantage DPP",
  eastport: "Eastport",
  alliance: "Alliance",
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
  open,
  onOpenChange,
  discrepancy,
  reportDate,
  resolvedBy,
  resolvedByName,
  onResolved,
}: Props) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const fieldsToResolve = discrepancy.fields.filter(
      (f) => selections[f.field]
    );
    if (fieldsToResolve.length === 0 && !remark.trim()) {
      toast({
        title: "Nothing to resolve",
        description: "Select at least one value or add a remark.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    for (const fd of fieldsToResolve) {
      const { error } = await resolveDiscrepancy({
        vesselName: discrepancy.vesselKey,
        reportDate,
        fieldName: fd.field,
        resolvedValue: selections[fd.field] ?? null,
        remark: remark.trim(),
        resolvedBy,
        resolvedByName,
      });
      if (error) {
        toast({
          title: "Error saving resolution",
          description: error,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    // If only remark, no field selections — save as general remark
    if (fieldsToResolve.length === 0 && remark.trim()) {
      const { error } = await resolveDiscrepancy({
        vesselName: discrepancy.vesselKey,
        reportDate,
        fieldName: "_remark",
        resolvedValue: null,
        remark: remark.trim(),
        resolvedBy,
        resolvedByName,
      });
      if (error) {
        toast({
          title: "Error saving remark",
          description: error,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast({ title: "Discrepancy resolved", description: `${discrepancy.vesselKey} — by ${resolvedByName}` });
    setSelections({});
    setRemark("");
    onOpenChange(false);
    onResolved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Resolve Discrepancy — {discrepancy.vesselKey}</DialogTitle>
          <DialogDescription>
            Pick the correct value for each field, or add a remark.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {discrepancy.fields.map((fd) => (
            <div key={fd.field} className="space-y-2">
              <Label className="text-xs font-semibold capitalize">
                {fd.field.replace(/_/g, " ")}
              </Label>
              <RadioGroup
                value={selections[fd.field] ?? ""}
                onValueChange={(val) =>
                  setSelections((prev) => ({ ...prev, [fd.field]: val }))
                }
                className="space-y-1"
              >
                {Object.entries(fd.values).map(([src, val]) => (
                  <div
                    key={src}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-1.5",
                      selections[fd.field] === String(val ?? "")
                        ? "border-primary bg-primary/5"
                        : "border-muted"
                    )}
                  >
                    <RadioGroupItem
                      value={String(val ?? "")}
                      id={`${fd.field}-${src}`}
                    />
                    <label
                      htmlFor={`${fd.field}-${src}`}
                      className="flex-1 text-xs cursor-pointer"
                    >
                      <Badge variant="outline" className="text-[10px] mr-2">
                        {SOURCE_LABELS[src] ?? src}
                      </Badge>
                      <span className="font-mono">{val ?? "—"}</span>
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Remark</Label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional note about this resolution…"
              className="text-xs h-16"
            />
          </div>

          <p className="text-[10px] text-muted-foreground">
            Resolved by: {resolvedByName}
          </p>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Save Resolution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
