import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertPosition } from "@/services/vesselPositions";
import { useCrmUser } from "@/hooks/useCrmUser";
import { toast } from "sonner";

const VESSEL_CLASSES = ["VLCC", "Suezmax", "Aframax", "LR2", "LR1", "MR", "Handy", "Specialized"];
const REGIONS = ["AG", "Med", "Black Sea", "UKC", "Baltic", "WAF", "USG", "USEC", "Far East", "India", "Caribbean", "RSEA", "SE Asia", "Red Sea"];

interface Props {
  onAdded: () => void;
}

export function AddPositionDialog({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { crmUserId } = useCrmUser();

  const [form, setForm] = useState({
    vessel_name: "",
    vessel_class: "",
    dwt: "",
    built_year: "",
    owner: "",
    operator: "",
    open_port: "",
    open_region: "",
    open_date: "",
    cargo_history: "",
    coating: "",
    status: "open",
    comments: "",
  });

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.vessel_name.trim()) {
      toast.error("Vessel name is required");
      return;
    }
    setSaving(true);
    try {
      await insertPosition({
        vessel_name: form.vessel_name.toUpperCase().trim(),
        vessel_class: form.vessel_class || null,
        dwt: form.dwt ? parseInt(form.dwt) : null,
        built_year: form.built_year ? parseInt(form.built_year) : null,
        owner: form.owner || null,
        operator: form.operator || null,
        open_port: form.open_port || null,
        open_region: form.open_region || null,
        open_date: form.open_date || null,
        cargo_history: form.cargo_history || null,
        coating: form.coating || null,
        status: form.status,
        comments: form.comments || null,
        import_method: "manual",
        imported_by: crmUserId,
        report_date: new Date().toISOString().slice(0, 10),
      });
      toast.success(`${form.vessel_name} added`);
      setOpen(false);
      setForm({
        vessel_name: "", vessel_class: "", dwt: "", built_year: "",
        owner: "", operator: "", open_port: "", open_region: "",
        open_date: "", cargo_history: "", coating: "", status: "open", comments: "",
      });
      onAdded();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Add Position
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Vessel Position</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Vessel Name *</Label>
            <Input value={form.vessel_name} onChange={(e) => update("vessel_name", e.target.value)} placeholder="e.g. FRONT JAGUAR" />
          </div>
          <div>
            <Label>Class</Label>
            <Select value={form.vessel_class} onValueChange={(v) => update("vessel_class", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {VESSEL_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>DWT</Label>
            <Input type="number" value={form.dwt} onChange={(e) => update("dwt", e.target.value)} placeholder="e.g. 299999" />
          </div>
          <div>
            <Label>Built Year</Label>
            <Input type="number" value={form.built_year} onChange={(e) => update("built_year", e.target.value)} placeholder="e.g. 2019" />
          </div>
          <div>
            <Label>Owner</Label>
            <Input value={form.owner} onChange={(e) => update("owner", e.target.value)} />
          </div>
          <div>
            <Label>Operator</Label>
            <Input value={form.operator} onChange={(e) => update("operator", e.target.value)} />
          </div>
          <div>
            <Label>Open Port</Label>
            <Input value={form.open_port} onChange={(e) => update("open_port", e.target.value)} placeholder="e.g. Fujairah" />
          </div>
          <div>
            <Label>Open Region</Label>
            <Select value={form.open_region} onValueChange={(v) => update("open_region", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Open Date</Label>
            <Input type="date" value={form.open_date} onChange={(e) => update("open_date", e.target.value)} />
          </div>
          <div>
            <Label>L3C (Cargo History)</Label>
            <Input value={form.cargo_history} onChange={(e) => update("cargo_history", e.target.value)} placeholder="e.g. NHC/FO/NAP" />
          </div>
          <div>
            <Label>Coating</Label>
            <Input value={form.coating} onChange={(e) => update("coating", e.target.value)} placeholder="e.g. EPOXY" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="on_subs">On Subs</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="ballasting">Ballasting</SelectItem>
                <SelectItem value="in_dock">In Dock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Comments</Label>
            <Input value={form.comments} onChange={(e) => update("comments", e.target.value)} placeholder="Additional notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Add Position"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
