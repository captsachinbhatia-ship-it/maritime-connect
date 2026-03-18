import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapEnquiry, REGION_LABELS } from '@/types/maritime';

interface EnquiryTableProps {
  enquiries: MapEnquiry[];
  onFindVessels: (enquiry: MapEnquiry) => void;
}

export function EnquiryTable({ enquiries, onFindVessels }: EnquiryTableProps) {
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = enquiries.filter(e => {
    if (regionFilter !== 'ALL' && e.load_region !== regionFilter && e.disch_region !== regionFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (typeFilter !== 'all' && e.charter_type !== typeFilter) return false;
    return true;
  });

  const statusColor = (s: string | null) =>
    s === 'fixed' ? 'bg-blue-500' : s === 'pending' ? 'bg-amber-500' : 'bg-green-500';

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="fixed">Fixed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="SPOT">Spot</SelectItem>
            <SelectItem value="VOY">Voyage</SelectItem>
            <SelectItem value="TC">Time Charter</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Qty (MT)</TableHead>
              <TableHead>Load</TableHead>
              <TableHead>Discharge</TableHead>
              <TableHead>Laycan</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No enquiries found</TableCell></TableRow>
            ) : filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-xs">{e.ref_no}</TableCell>
                <TableCell className="text-xs">{e.cargo}</TableCell>
                <TableCell className="text-xs">{e.qty_mt?.toLocaleString()}</TableCell>
                <TableCell className="text-xs">{e.load_port} <Badge variant="outline" className="text-[9px] ml-1">{e.load_region}</Badge></TableCell>
                <TableCell className="text-xs">{e.disch_port} <Badge variant="outline" className="text-[9px] ml-1">{e.disch_region}</Badge></TableCell>
                <TableCell className="text-xs">{e.laycan}</TableCell>
                <TableCell className="text-xs">{e.charter_type}</TableCell>
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
