import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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

const REGIONS: Region[] = ['ALL', 'ME', 'SA', 'FE', 'EU', 'AM', 'AF'];

export default function MapView() {
  const { vessels, enquiries, ports, loading } = useMapData();
  const [regionFilter, setRegionFilter] = useState<Region>('ALL');
  const [showVessels, setShowVessels] = useState(true);
  const [showEnquiries, setShowEnquiries] = useState(true);
  const [showPorts, setShowPorts] = useState(true);
  const [matchEnquiry, setMatchEnquiry] = useState<MapEnquiry | null>(null);

  const matchResults = useCargoMatch(vessels, matchEnquiry);

  const handleFindVessels = (enquiry: MapEnquiry) => {
    setMatchEnquiry(enquiry);
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
          <TabsTrigger value="vessels" className="gap-1.5">
            <Ship className="h-3.5 w-3.5" /> Vessel Openings
          </TabsTrigger>
          <TabsTrigger value="pda" className="gap-1.5">
            <Landmark className="h-3.5 w-3.5" /> Port PDA
          </TabsTrigger>
        </TabsList>

        {/* World Map Tab */}
        <TabsContent value="map" className="space-y-3">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Region pills */}
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

            {/* Layer toggles */}
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

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Vessel Opening</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Open Enquiry</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending Enquiry</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Fixed Enquiry</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 bg-blue-500" style={{ width: 8, height: 8 }} /> Port / PDA</span>
          </div>
        </TabsContent>

        {/* Enquiries Tab */}
        <TabsContent value="enquiries">
          <EnquiryTable enquiries={enquiries} onFindVessels={handleFindVessels} />
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

      {/* Matching Panel */}
      <MatchingPanel
        enquiry={matchEnquiry}
        results={matchResults}
        open={!!matchEnquiry}
        onClose={() => setMatchEnquiry(null)}
      />
    </div>
  );
}
