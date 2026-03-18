import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Vessel, REGION_LABELS } from '@/types/maritime';

interface VesselTableProps {
  vessels: Vessel[];
}

export function VesselTable({ vessels }: VesselTableProps) {
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = vessels.filter(v => {
    if (regionFilter !== 'ALL' && v.region !== regionFilter) return false;
    if (typeFilter !== 'all' && v.vessel_type !== typeFilter) return false;
    return true;
  });

  const types = [...new Set(vessels.map(v => v.vessel_type).filter(Boolean))] as string[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(REGION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vessel Types</SelectItem>
            {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vessel</TableHead>
              <TableHead>IMO</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>DWT</TableHead>
              <TableHead>Open Port</TableHead>
              <TableHead>Open Date</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Flag</TableHead>
              <TableHead>Built</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No vessels found</TableCell></TableRow>
            ) : filtered.map(v => (
              <TableRow key={v.id}>
                <TableCell className="font-medium text-xs">{v.name}</TableCell>
                <TableCell className="text-xs">{v.imo}</TableCell>
                <TableCell className="text-xs">{v.vessel_type}</TableCell>
                <TableCell className="text-xs">{v.dwt?.toLocaleString()}</TableCell>
                <TableCell className="text-xs">{v.open_port}</TableCell>
                <TableCell className="text-xs">{v.open_date}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{v.region}</Badge></TableCell>
                <TableCell className="text-xs">{v.flag}</TableCell>
                <TableCell className="text-xs">{v.year_built}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
