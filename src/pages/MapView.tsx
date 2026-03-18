import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Globe, TableProperties, Ship, Landmark } from 'lucide-react';
import { useMapData } from '@/hooks/useMapData';
import { useCargoMatch } from '@/hooks/useCargoMatch';
import { WorldMap } from '@/components/map/WorldMap';
import { MatchingPanel } from '@/components/map/MatchingPanel';
import { EnquiryTable } from '@/components/map/EnquiryTable';
import { VesselTable } from '@/components/map/VesselTable';
import { PdaGrid } from '@/components/map/PdaGrid';
import { MapEnquiry, Region, REGION_LABELS } from '@/types/maritime';
import { TankerEnquiry } from '@/types/tanker';
import { matchTankerVessels } from '@/lib/tankerMatchEngine';

const REGIONS: Region[] = ['ALL', 'ME', 'SA', 'FE', 'EU', 'AM', 'AF'];

export default function MapView() {
  const { vessels, enquiries, ports, tankerVessels, tankerEnquiries, loading } = useMapData();
  const [regionFilter, setRegionFilter] = useState<Region>('ALL');
  const [showVessels, setShowVessels] = useState(true);
  const [showEnquiries, setShowEnquiries] = useState(true);
  const [showPorts, setShowPorts] = useState(true);

  // Generic matching
  const [matchEnquiry, setMatchEnquiry] = useState<MapEnquiry | null>(null);
  const matchResults = useCargoMatch(vessels, matchEnquiry);

  // Tanker matching
  const [tankerMatchEnquiry, setTankerMatchEnquiry] = useState<TankerEnquiry | null>(null);
  const tankerMatchResults = useMemo(() => {
    if (!tankerMatchEnquiry) return [];
    return matchTankerVessels(tankerVessels, tankerMatchEnquiry);
  }, [tankerVessels, tankerMatchEnquiry]);

  const handleFindVessels = (enquiry: MapEnquiry) => {
    setMatchEnquiry(enquiry);
  };

  const handleFindTankerVessels = (enquiry: TankerEnquiry) => {
    setTankerMatchEnquiry(enquiry);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maritime Map</h1>
          <p className="text-sm text-muted-foreground">
            {vessels.length} vessels · {enquiries.length} enquiries · {ports.length} ports
            {tankerVessels.length > 0 && ` · ${tankerVessels.length} tankers · ${tankerEnquiries.length} tanker enquiries`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="map" className="space-y-4">
        <TabsList>
          <TabsTrigger value="map" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" /> World Map
          </TabsTrigger>
          <TabsTrigger value="enquiries" className="gap-1.5">
            <TableProperties className="h-3.5 w-3.5" /> Enquiries
          </TabsTrigger>
          <TabsTrigger value="tanker-enquiries" className="gap-1.5">
            <Ship className="h-3.5 w-3.5" /> Tanker Enquiries
          </TabsTrigger>
          <TabsTrigger value="vessels" className="gap-1.5">
            <Ship className="h-3.5 w-3.5" /> Vessel Openings
          </TabsTrigger>
          <TabsTrigger value="pda" className="gap-1.5">
            <Landmark className="h-3.5 w-3.5" /> Port PDA
          </TabsTrigger>
        </TabsList>

        {/* World Map Tab */}
        <TabsContent value="map" className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              {REGIONS.map(r => (
                <Button
                  key={r}
                  variant={regionFilter === r ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setRegionFilter(r)}
                >
                  {REGION_LABELS[r]}
                </Button>
              ))}
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Switch id="show-vessels" checked={showVessels} onCheckedChange={setShowVessels} className="h-4 w-7" />
                <Label htmlFor="show-vessels" className="text-xs cursor-pointer flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Vessels
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch id="show-enquiries" checked={showEnquiries} onCheckedChange={setShowEnquiries} className="h-4 w-7" />
                <Label htmlFor="show-enquiries" className="text-xs cursor-pointer flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Enquiries
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch id="show-ports" checked={showPorts} onCheckedChange={setShowPorts} className="h-4 w-7" />
                <Label htmlFor="show-ports" className="text-xs cursor-pointer flex items-center gap-1">
                  <span className="h-2 w-2 bg-blue-500" style={{ width: 8, height: 8 }} /> Ports
                </Label>
              </div>
            </div>
          </div>

          <WorldMap
            vessels={vessels}
            enquiries={enquiries}
            ports={ports}
            regionFilter={regionFilter}
            showVessels={showVessels}
            showEnquiries={showEnquiries}
            showPorts={showPorts}
            onFindVessels={handleFindVessels}
          />

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Vessel Opening</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Open Enquiry</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Fixed</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-blue-500" style={{ width: 8, height: 8 }} /> Port / PDA</span>
          </div>
        </TabsContent>

        {/* Generic Enquiries Tab */}
        <TabsContent value="enquiries">
          <EnquiryTable enquiries={enquiries} onFindVessels={handleFindVessels} />
        </TabsContent>

        {/* Tanker Enquiries Tab */}
        <TabsContent value="tanker-enquiries">
          <TankerEnquiryTable enquiries={tankerEnquiries} onFindVessels={handleFindTankerVessels} />
        </TabsContent>

        {/* Vessels Tab */}
        <TabsContent value="vessels">
          <VesselTable vessels={vessels} />
        </TabsContent>

        {/* Port PDA Tab */}
        <TabsContent value="pda">
          <PdaGrid ports={ports} />
        </TabsContent>
      </Tabs>

      {/* Generic Matching Panel */}
      <MatchingPanel
        mode="generic"
        enquiry={matchEnquiry}
        results={matchResults}
        open={!!matchEnquiry}
        onClose={() => setMatchEnquiry(null)}
      />

      {/* Tanker Matching Panel (with TCE) */}
      <MatchingPanel
        mode="tanker"
        enquiry={tankerMatchEnquiry}
        results={tankerMatchResults}
        open={!!tankerMatchEnquiry}
        onClose={() => setTankerMatchEnquiry(null)}
      />
    </div>
  );
}

// ─── Tanker Enquiry Table (inline) ──────────────────────────────────
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function TankerEnquiryTable({ enquiries, onFindVessels }: { enquiries: TankerEnquiry[]; onFindVessels: (e: TankerEnquiry) => void }) {
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = enquiries.filter(e => {
    if (catFilter !== 'all' && e.cargo_category !== catFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  });

  const statusColor = (s: string | null) =>
    s === 'fixed' ? 'bg-blue-500' : s === 'on_subs' ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Crude">Crude</SelectItem>
            <SelectItem value="CPP">CPP</SelectItem>
            <SelectItem value="DPP">DPP</SelectItem>
            <SelectItem value="Chemical">Chemical</SelectItem>
            <SelectItem value="LPG">LPG</SelectItem>
            <SelectItem value="LNG">LNG</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="on_subs">On Subs</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Charterer</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Qty (MT)</TableHead>
              <TableHead>Load</TableHead>
              <TableHead>Discharge</TableHead>
              <TableHead>Laycan</TableHead>
              <TableHead>Freight</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No tanker enquiries found</TableCell></TableRow>
            ) : filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-xs">{e.ref_no}</TableCell>
                <TableCell className="text-xs">{e.charterer}</TableCell>
                <TableCell className="text-xs">{e.cargo_grade}</TableCell>
                <TableCell><Badge variant="outline" className="text-[9px]">{e.cargo_category}</Badge></TableCell>
                <TableCell className="text-xs">{e.quantity_mt?.toLocaleString()}</TableCell>
                <TableCell className="text-xs">{e.load_port}</TableCell>
                <TableCell className="text-xs">{e.disch_port}</TableCell>
                <TableCell className="text-xs">{e.laycan_from} — {e.laycan_to}</TableCell>
                <TableCell className="text-xs">{e.freight_indication}</TableCell>
                <TableCell><Badge className={`text-[10px] text-white ${statusColor(e.status)}`}>{e.status}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => onFindVessels(e)}>
                    Find Vessels
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
