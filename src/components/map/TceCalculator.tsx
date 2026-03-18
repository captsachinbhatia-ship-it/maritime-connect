import { useState, useEffect, useMemo } from 'react';
import { Loader2, Calculator, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { TankerVessel, TankerEnquiry } from '@/types/tanker';
import {
  calculateTce,
  lookupDistance,
  getDefaultCanalDues,
  getDefaultIfoConsumption,
  DEFAULT_LADEN_SPEED,
  DEFAULT_BALLAST_SPEED,
  DEFAULT_PORT_MGO_CONSUMPTION,
  DEFAULT_IFO_PRICE,
  DEFAULT_MGO_PRICE,
  DEFAULT_PORT_DAYS_LOAD,
  DEFAULT_PORT_DAYS_DISCH,
  TceResult,
} from '@/lib/tceCalculator';

interface TceCalculatorProps {
  vessel: TankerVessel | null;
  enquiry: TankerEnquiry | null;
  open: boolean;
  onClose: () => void;
}

function parseFreightRevenue(indication: string | null, qtyMt: number | null): number {
  if (!indication) return 0;
  const s = indication.replace(/[,$]/g, '').trim();
  // Lumpsum: "$850,000" or "$1.2M"
  if (s.includes('M')) {
    const num = parseFloat(s.replace(/M/i, ''));
    return isNaN(num) ? 0 : num * 1_000_000;
  }
  // Per MT: "$28/MT"
  if (s.includes('/MT') && qtyMt) {
    const num = parseFloat(s.replace(/\/MT/i, ''));
    return isNaN(num) ? 0 : num * qtyMt;
  }
  // WS: "WS 72" — needs flat rate, return 0 for now (user fills in)
  if (s.toUpperCase().startsWith('WS')) return 0;
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

export function TceCalculator({ vessel, enquiry, open, onClose }: TceCalculatorProps) {
  // Editable inputs
  const [distanceNm, setDistanceNm] = useState(0);
  const [ladenSpeed, setLadenSpeed] = useState(DEFAULT_LADEN_SPEED);
  const [ballastSpeed, setBallastSpeed] = useState(DEFAULT_BALLAST_SPEED);
  const [ifoConsumption, setIfoConsumption] = useState(30);
  const [mgoConsumption, setMgoConsumption] = useState(DEFAULT_PORT_MGO_CONSUMPTION);
  const [ifoPrice, setIfoPrice] = useState(DEFAULT_IFO_PRICE);
  const [mgoPrice, setMgoPrice] = useState(DEFAULT_MGO_PRICE);
  const [portDaysLoad, setPortDaysLoad] = useState(DEFAULT_PORT_DAYS_LOAD);
  const [portDaysDisch, setPortDaysDisch] = useState(DEFAULT_PORT_DAYS_DISCH);
  const [portCostLoad, setPortCostLoad] = useState(0);
  const [portCostDisch, setPortCostDisch] = useState(0);
  const [canalDues, setCanalDues] = useState(0);
  const [freightRevenue, setFreightRevenue] = useState(0);
  const [saving, setSaving] = useState(false);

  // Pre-fill when vessel/enquiry change
  useEffect(() => {
    if (!vessel || !enquiry || !open) return;

    const loadPort = enquiry.load_port || '';
    const dischPort = enquiry.disch_port || '';
    const dist = lookupDistance(loadPort, dischPort);
    if (dist) setDistanceNm(dist);

    setIfoConsumption(getDefaultIfoConsumption(vessel.vessel_class || ''));
    setCanalDues(getDefaultCanalDues(
      vessel.vessel_class || '',
      enquiry.load_region || '',
      enquiry.disch_region || ''
    ));

    const freight = parseFreightRevenue(enquiry.freight_indication, enquiry.quantity_mt);
    setFreightRevenue(freight);

    // Try to lookup port costs from port_pda
    (async () => {
      const { data } = await supabase
        .from('port_pda')
        .select('port_name, port_dues, pilotage, towage, agency_fees, mooring, misc')
        .in('port_name', [loadPort.split(',')[0].trim(), dischPort.split(',')[0].trim()]);
      if (data) {
        const loadPda = data.find(p => loadPort.includes(p.port_name || ''));
        const dischPda = data.find(p => dischPort.includes(p.port_name || ''));
        if (loadPda) {
          setPortCostLoad(
            (loadPda.port_dues || 0) + (loadPda.pilotage || 0) + (loadPda.towage || 0) +
            (loadPda.agency_fees || 0) + (loadPda.mooring || 0) + (loadPda.misc || 0)
          );
        }
        if (dischPda) {
          setPortCostDisch(
            (dischPda.port_dues || 0) + (dischPda.pilotage || 0) + (dischPda.towage || 0) +
            (dischPda.agency_fees || 0) + (dischPda.mooring || 0) + (dischPda.misc || 0)
          );
        }
      }
    })();
  }, [vessel, enquiry, open]);

  const result: TceResult | null = useMemo(() => {
    if (!distanceNm || !vessel || !enquiry) return null;
    return calculateTce({
      loadPort: enquiry.load_port || '',
      dischPort: enquiry.disch_port || '',
      loadRegion: enquiry.load_region || '',
      dischRegion: enquiry.disch_region || '',
      vesselClass: vessel.vessel_class || '',
      distanceNm,
      ladenSpeed,
      ballastSpeed,
      ifoConsumption,
      mgoConsumption,
      ifoPrice,
      mgoPrice,
      portDaysLoad,
      portDaysDisch,
      portCostLoad,
      portCostDisch,
      canalDues,
      freightRevenue,
    });
  }, [distanceNm, ladenSpeed, ballastSpeed, ifoConsumption, mgoConsumption, ifoPrice, mgoPrice, portDaysLoad, portDaysDisch, portCostLoad, portCostDisch, canalDues, freightRevenue, vessel, enquiry]);

  const costChartData = result ? [
    { name: 'Bunker', value: result.bunkerCost, fill: '#f59e0b' },
    { name: 'Port', value: result.portCosts, fill: '#3b82f6' },
    { name: 'Canal', value: result.canalDues, fill: '#8b5cf6' },
    { name: 'Commission', value: result.brokerCommission, fill: '#6b7280' },
  ] : [];

  const handleSave = async () => {
    if (!result || !vessel || !enquiry) return;
    setSaving(true);
    const { error } = await supabase.from('voyage_calculations').insert({
      enquiry_id: enquiry.id,
      vessel_id: vessel.id,
      load_port: enquiry.load_port,
      disch_port: enquiry.disch_port,
      distance_nm: distanceNm,
      sea_days: result.totalSeaDays,
      port_days_load: portDaysLoad,
      port_days_disch: portDaysDisch,
      bunker_ifo_mt: result.bunkerIfoMt,
      bunker_mgo_mt: result.bunkerMgoMt,
      ifo_price_usd: ifoPrice,
      mgo_price_usd: mgoPrice,
      bunker_cost: result.bunkerCost,
      port_cost_load: portCostLoad,
      port_cost_disch: portCostDisch,
      canal_dues: canalDues,
      total_voyage_cost: result.totalVoyageCost,
      freight_revenue: freightRevenue,
      tce_usd_day: result.tcePerDay,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Voyage calculation saved.' });
    }
  };

  if (!vessel || !enquiry) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" /> TCE Calculator
          </DialogTitle>
          <DialogDescription>
            {vessel.vessel_name} ({vessel.vessel_class} · {vessel.dwt_mt?.toLocaleString()} DWT) —{' '}
            {enquiry.ref_no}: {enquiry.load_port} → {enquiry.disch_port}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Route + vessel inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Distance (NM)</Label>
              <Input type="number" value={distanceNm} onChange={e => setDistanceNm(Number(e.target.value))} />
              {!distanceNm && <p className="text-[10px] text-destructive">Enter distance manually</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Laden Speed (kn)</Label>
              <Input type="number" step="0.5" value={ladenSpeed} onChange={e => setLadenSpeed(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ballast Speed (kn)</Label>
              <Input type="number" step="0.5" value={ballastSpeed} onChange={e => setBallastSpeed(Number(e.target.value))} />
            </div>
          </div>

          {/* Fuel */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">IFO cons. (MT/d)</Label>
              <Input type="number" value={ifoConsumption} onChange={e => setIfoConsumption(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">MGO cons. (MT/d)</Label>
              <Input type="number" value={mgoConsumption} onChange={e => setMgoConsumption(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">IFO price ($/MT)</Label>
              <Input type="number" value={ifoPrice} onChange={e => setIfoPrice(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">MGO price ($/MT)</Label>
              <Input type="number" value={mgoPrice} onChange={e => setMgoPrice(Number(e.target.value))} />
            </div>
          </div>

          {/* Port + canal */}
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Port days (load)</Label>
              <Input type="number" step="0.5" value={portDaysLoad} onChange={e => setPortDaysLoad(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Port days (disch)</Label>
              <Input type="number" step="0.5" value={portDaysDisch} onChange={e => setPortDaysDisch(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Port cost load ($)</Label>
              <Input type="number" value={portCostLoad} onChange={e => setPortCostLoad(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Port cost disch ($)</Label>
              <Input type="number" value={portCostDisch} onChange={e => setPortCostDisch(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Canal Dues ($)</Label>
              <Input type="number" value={canalDues} onChange={e => setCanalDues(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Freight Revenue ($)</Label>
              <Input type="number" value={freightRevenue} onChange={e => setFreightRevenue(Number(e.target.value))} />
              {enquiry.freight_indication && (
                <p className="text-[10px] text-muted-foreground">Indication: {enquiry.freight_indication}</p>
              )}
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> Voyage Results
                </h4>
                <Badge
                  variant={result.tcePerDay > 0 ? 'default' : 'destructive'}
                  className="text-sm font-bold px-3"
                >
                  TCE: ${result.tcePerDay.toLocaleString()}/day
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Laden sea days</p>
                  <p className="font-medium">{result.ladenSeaDays}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ballast sea days</p>
                  <p className="font-medium">{result.ballastSeaDays}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total voyage days</p>
                  <p className="font-semibold">{result.totalVoyageDays}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bunker IFO</p>
                  <p className="font-medium">{result.bunkerIfoMt.toLocaleString()} MT</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bunker MGO</p>
                  <p className="font-medium">{result.bunkerMgoMt.toLocaleString()} MT</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bunker cost</p>
                  <p className="font-medium">${result.bunkerCost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Port costs</p>
                  <p className="font-medium">${result.portCosts.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Canal dues</p>
                  <p className="font-medium">${result.canalDues.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total voyage cost</p>
                  <p className="font-semibold text-destructive">${result.totalVoyageCost.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gross freight</p>
                  <p className="font-medium">${result.grossFreight.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Commission (1.25%)</p>
                  <p className="font-medium">${result.brokerCommission.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Net freight</p>
                  <p className="font-semibold text-green-600">${result.netFreight.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs pt-2 border-t">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-muted-foreground">
                  Breakeven freight: <span className="font-semibold text-foreground">${result.breakevenFreight.toLocaleString()}</span>
                </span>
              </div>

              {/* Cost breakdown chart */}
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={costChartData} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a52" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {costChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSave} disabled={saving || !result}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save Calculation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
