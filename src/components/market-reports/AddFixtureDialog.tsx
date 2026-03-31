import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { VESSEL_CLASSES } from "@/lib/marketConstants";
import type { MarketRecord } from "@/services/marketData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  editRecord?: MarketRecord | null;
}

const REPORT_TYPES = ["DPP", "CPP"];
const RECORD_TYPES = ["FIXTURE", "ENQUIRY"];
const STATUS_OPTIONS = ["fixed", "on_subs", "reported", "failed", "withdrawn"];
const CARGO_TYPES = ["Crude", "DPP", "CPP", "Chemical", "LPG", "LNG", "Vegetable Oil", "Dry Bulk"];

export function AddFixtureDialog({ open, onOpenChange, onSaved, editRecord }: Props) {
  const [saving, setSaving] = useState(false);
  const isEdit = !!editRecord;
  const today = new Date().toISOString().slice(0, 10);

  const [reportType, setReportType] = useState("DPP");
  const [recordType, setRecordType] = useState("FIXTURE");
  const [reportDate, setReportDate] = useState(today);
  const [vesselName, setVesselName] = useState("");
  const [vesselClass, setVesselClass] = useState("");
  const [dwt, setDwt] = useState("");
  const [charterer, setCharterer] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [cargoGrade, setCargoGrade] = useState("");
  const [quantityMt, setQuantityMt] = useState("");
  const [loadPort, setLoadPort] = useState("");
  const [loadRegion, setLoadRegion] = useState("");
  const [dischargePort, setDischargePort] = useState("");
  const [dischargeRegion, setDischargeRegion] = useState("");
  const [laycanFrom, setLaycanFrom] = useState("");
  const [laycanTo, setLaycanTo] = useState("");
  const [rateValue, setRateValue] = useState("");
  const [fixtureStatus, setFixtureStatus] = useState("reported");
  const [owner, setOwner] = useState("");
  const [broker, setBroker] = useState("");
  const [notes, setNotes] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (editRecord) {
      setReportType(editRecord.report_type ?? "DPP");
      setRecordType(editRecord.record_type ?? "FIXTURE");
      setReportDate(editRecord.report_date ?? today);
      setVesselName(editRecord.vessel_name ?? "");
      setVesselClass(editRecord.vessel_class ?? "");
      setDwt(editRecord.dwt ? String(editRecord.dwt) : "");
      setCharterer(editRecord.charterer ?? "");
      setCargoType(editRecord.cargo_type ?? "");
      setCargoGrade(editRecord.cargo_grade ?? "");
      setQuantityMt(editRecord.quantity_mt ? String(editRecord.quantity_mt) : "");
      setLoadPort(editRecord.load_port ?? "");
      setLoadRegion(editRecord.load_region ?? "");
      setDischargePort(editRecord.discharge_port ?? "");
      setDischargeRegion(editRecord.discharge_region ?? "");
      setLaycanFrom(editRecord.laycan_from ?? "");
      setLaycanTo(editRecord.laycan_to ?? "");
      setRateValue(editRecord.rate_value ?? "");
      setFixtureStatus(editRecord.fixture_status ?? "reported");
      setOwner(editRecord.owner ?? "");
      setBroker(editRecord.broker ?? "");
      setNotes(editRecord.raw_text ?? "");
    } else {
      resetForm();
    }
  }, [editRecord, open]);

  const resetForm = () => {
    setVesselName(""); setVesselClass(""); setDwt("");
    setCharterer(""); setCargoType(""); setCargoGrade("");
    setQuantityMt(""); setLoadPort(""); setLoadRegion("");
    setDischargePort(""); setDischargeRegion("");
    setLaycanFrom(""); setLaycanTo("");
    setRateValue(""); setFixtureStatus("reported");
    setOwner(""); setBroker(""); setNotes("");
    setReportDate(today); setRecordType("FIXTURE");
    setReportType("DPP");
  };

  const handleSave = async () => {
    if (!vesselClass) {
      toast({ title: "Missing field", description: "Vessel class is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const row = {
        report_source: isEdit ? (editRecord.report_source ?? "aq_manual") : "aq_manual",
        report_date: reportDate,
        report_type: reportType,
        record_type: recordType,
        source_broker: isEdit ? (editRecord.source_broker ?? "aq_manual") : "aq_manual",
        vessel_name: vesselName || null,
        vessel_class: vesselClass,
        dwt: dwt ? parseInt(dwt) : null,
        charterer: charterer || null,
        cargo_type: cargoType || null,
        cargo_grade: cargoGrade || null,
        quantity_mt: quantityMt ? parseInt(quantityMt) : null,
        load_port: loadPort || null,
        load_region: loadRegion || null,
        discharge_port: dischargePort || null,
        discharge_region: dischargeRegion || null,
        laycan_from: laycanFrom || null,
        laycan_to: laycanTo || null,
        rate_value: rateValue || null,
        fixture_status: recordType === "FIXTURE" ? fixtureStatus : null,
        owner: owner || null,
        broker: broker || null,
        raw_text: notes || null,
        pdf_filename: isEdit ? (editRecord.pdf_filename ?? "manual_entry") : "manual_entry",
      };

      if (isEdit) {
        const { error } = await supabase.from("market_data").update({ ...row, updated_at: new Date().toISOString() }).eq("id", editRecord.id);
        if (error) throw error;
        toast({ title: "Fixture updated", description: `${vesselName || "TBN"} amended successfully` });
      } else {
        const { error } = await supabase.from("market_data").insert(row);
        if (error) throw error;
        toast({ title: "Fixture added", description: `${vesselName || "TBN"} — ${loadPort || "?"} → ${dischargePort || "?"}` });
      }

      resetForm();
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Fixture" : "Add Fixture / Enquiry"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Amend details for ${editRecord.vessel_name || "TBN"} — source: ${editRecord.report_source ?? "unknown"}`
              : "Manually add a fixture or enquiry not reported by any broker"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Row 1: Type selectors + date */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Record Type</Label>
              <Select value={recordType} onValueChange={setRecordType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Report Date</Label>
              <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          {/* Row 2: Vessel */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Vessel Name</Label>
              <Input value={vesselName} onChange={(e) => setVesselName(e.target.value)} placeholder="TBN" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Vessel Class *</Label>
              <Select value={vesselClass} onValueChange={setVesselClass}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {VESSEL_CLASSES.map((vc) => <SelectItem key={vc} value={vc}>{vc}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">DWT</Label>
              <Input type="number" value={dwt} onChange={(e) => setDwt(e.target.value)} placeholder="300000" className="h-8 text-xs" />
            </div>
          </div>

          {/* Row 3: Cargo */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Charterer</Label>
              <Input value={charterer} onChange={(e) => setCharterer(e.target.value)} placeholder="SHELL" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Cargo Type</Label>
              <Select value={cargoType} onValueChange={setCargoType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CARGO_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Cargo Grade</Label>
              <Input value={cargoGrade} onChange={(e) => setCargoGrade(e.target.value)} placeholder="NHC, FO, CPP..." className="h-8 text-xs" />
            </div>
          </div>

          {/* Row 4: Quantity + Ports */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Quantity (MT)</Label>
              <Input type="number" value={quantityMt} onChange={(e) => setQuantityMt(e.target.value)} placeholder="270000" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Load Port</Label>
              <Input value={loadPort} onChange={(e) => setLoadPort(e.target.value)} placeholder="Ras Tanura" className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Discharge Port</Label>
              <Input value={dischargePort} onChange={(e) => setDischargePort(e.target.value)} placeholder="Singapore" className="h-8 text-xs" />
            </div>
          </div>

          {/* Row 5: Regions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Load Region</Label>
              <Input value={loadRegion} onChange={(e) => setLoadRegion(e.target.value)} placeholder="AG, WAF, USG..." className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Discharge Region</Label>
              <Input value={dischargeRegion} onChange={(e) => setDischargeRegion(e.target.value)} placeholder="Far East, UKC..." className="h-8 text-xs" />
            </div>
          </div>

          {/* Row 6: Laycan + Rate + Status */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Laycan From</Label>
              <Input type="date" value={laycanFrom} onChange={(e) => setLaycanFrom(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Laycan To</Label>
              <Input type="date" value={laycanTo} onChange={(e) => setLaycanTo(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Rate</Label>
              <Input value={rateValue} onChange={(e) => setRateValue(e.target.value)} placeholder="W62, $3.2M" className="h-8 text-xs" />
            </div>
            {recordType === "FIXTURE" && (
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={fixtureStatus} onValueChange={setFixtureStatus}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Row 7: Owner + Broker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Owner</Label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Broker</Label>
              <Input value={broker} onChange={(e) => setBroker(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes / Comments <span className="text-muted-foreground">(appears in report as remarks)</span></Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. We fix, AQ role, special terms..." className="text-xs min-h-[60px]" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Update Fixture" : `Save ${recordType === "FIXTURE" ? "Fixture" : "Enquiry"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
