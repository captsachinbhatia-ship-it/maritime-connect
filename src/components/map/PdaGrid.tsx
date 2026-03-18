import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PortPda, REGION_LABELS } from '@/types/maritime';
import { PdaComparison } from './PdaComparison';

interface PdaGridProps {
  ports: PortPda[];
}

function portTotal(p: PortPda) {
  return (p.port_dues || 0) + (p.pilotage || 0) + (p.towage || 0) +
    (p.agency_fees || 0) + (p.mooring || 0) + (p.misc || 0);
}

export function PdaGrid({ ports }: PdaGridProps) {
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = ports.filter(p => regionFilter === 'ALL' || p.region === regionFilter);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const selectedPorts = ports.filter(p => selected.has(p.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(REGION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={compareMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setCompareMode(!compareMode); if (compareMode) setSelected(new Set()); }}
        >
          {compareMode ? `Compare (${selected.size}/4)` : 'Compare Ports'}
        </Button>
      </div>

      {compareMode && selectedPorts.length >= 2 && (
        <PdaComparison ports={selectedPorts} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(port => (
          <div key={port.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{port.port_name}</p>
                <p className="text-xs text-muted-foreground">{port.country}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{port.region}</Badge>
                {compareMode && (
                  <Checkbox
                    checked={selected.has(port.id)}
                    onCheckedChange={() => toggleSelect(port.id)}
                    disabled={!selected.has(port.id) && selected.size >= 4}
                  />
                )}
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Port Dues</span><span>${port.port_dues?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pilotage</span><span>${port.pilotage?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Towage</span><span>${port.towage?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Agency Fees</span><span>${port.agency_fees?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mooring</span><span>${port.mooring?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Misc</span><span>${port.misc?.toLocaleString()}</span></div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between font-semibold text-sm">
                <span>Total PDA</span>
                <span>${portTotal(port).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
