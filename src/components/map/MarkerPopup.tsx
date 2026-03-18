import { X, Anchor, Ship, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Vessel, MapEnquiry, PortPda } from '@/types/maritime';

interface MarkerPopupProps {
  type: 'vessel' | 'enquiry' | 'port';
  data: Vessel | MapEnquiry | PortPda;
  x: number;
  y: number;
  onClose: () => void;
  onFindVessels?: () => void;
}

export function MarkerPopup({ type, data, x, y, onClose, onFindVessels }: MarkerPopupProps) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: Math.min(x, window.innerWidth - 320),
    top: Math.max(y - 10, 10),
    zIndex: 50,
  };

  return (
    <div style={style} className="w-72 rounded-lg border bg-card shadow-xl p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {type === 'vessel' && <Anchor className="h-4 w-4 text-amber-500" />}
          {type === 'enquiry' && <Ship className="h-4 w-4 text-green-500" />}
          {type === 'port' && <MapPin className="h-4 w-4 text-blue-500" />}
          <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">{type}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {type === 'vessel' && <VesselCard vessel={data as Vessel} />}
      {type === 'enquiry' && <EnquiryCard enquiry={data as MapEnquiry} onFindVessels={onFindVessels} />}
      {type === 'port' && <PortCard port={data as PortPda} />}
    </div>
  );
}

function VesselCard({ vessel }: { vessel: Vessel }) {
  return (
    <div className="space-y-1.5">
      <p className="font-semibold">{vessel.name}</p>
      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
        <span>Type: <span className="text-foreground">{vessel.vessel_type || '—'}</span></span>
        <span>DWT: <span className="text-foreground">{vessel.dwt?.toLocaleString() || '—'}</span></span>
        <span>Open: <span className="text-foreground">{vessel.open_port || '—'}</span></span>
        <span>Date: <span className="text-foreground">{vessel.open_date || '—'}</span></span>
        <span>Flag: <span className="text-foreground">{vessel.flag || '—'}</span></span>
        <span>Built: <span className="text-foreground">{vessel.year_built || '—'}</span></span>
      </div>
      <Badge variant="outline" className="text-[10px]">{vessel.region}</Badge>
    </div>
  );
}

function EnquiryCard({ enquiry, onFindVessels }: { enquiry: MapEnquiry; onFindVessels?: () => void }) {
  const statusColor = enquiry.status === 'fixed' ? 'bg-blue-500' : enquiry.status === 'pending' ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="font-semibold">{enquiry.ref_no}</p>
        <Badge className={`text-[10px] text-white ${statusColor}`}>{enquiry.status}</Badge>
      </div>
      <p className="text-xs font-medium">{enquiry.cargo} — {enquiry.qty_mt?.toLocaleString()} MT</p>
      <p className="text-xs text-muted-foreground">{enquiry.load_port} → {enquiry.disch_port}</p>
      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
        <span>Laycan: <span className="text-foreground">{enquiry.laycan || '—'}</span></span>
        <span>Type: <span className="text-foreground">{enquiry.charter_type || '—'}</span></span>
      </div>
      {onFindVessels && (
        <Button size="sm" className="w-full h-7 text-xs mt-2" onClick={onFindVessels}>
          Find Vessels
        </Button>
      )}
    </div>
  );
}

function PortCard({ port }: { port: PortPda }) {
  const total = (port.port_dues || 0) + (port.pilotage || 0) + (port.towage || 0) +
    (port.agency_fees || 0) + (port.mooring || 0) + (port.misc || 0);
  return (
    <div className="space-y-1.5">
      <p className="font-semibold">{port.port_name}, {port.country}</p>
      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
        <span>Port Dues: <span className="text-foreground">${port.port_dues?.toLocaleString()}</span></span>
        <span>Pilotage: <span className="text-foreground">${port.pilotage?.toLocaleString()}</span></span>
        <span>Towage: <span className="text-foreground">${port.towage?.toLocaleString()}</span></span>
        <span>Agency: <span className="text-foreground">${port.agency_fees?.toLocaleString()}</span></span>
        <span>Mooring: <span className="text-foreground">${port.mooring?.toLocaleString()}</span></span>
        <span>Misc: <span className="text-foreground">${port.misc?.toLocaleString()}</span></span>
      </div>
      <div className="pt-1 border-t">
        <span className="text-xs font-semibold">Total PDA: ${total.toLocaleString()}</span>
      </div>
      <Badge variant="outline" className="text-[10px]">{port.region}</Badge>
    </div>
  );
}
