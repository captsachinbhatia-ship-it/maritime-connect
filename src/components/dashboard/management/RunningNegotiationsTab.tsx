import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Handshake } from 'lucide-react';

export function RunningNegotiationsTab() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Handshake className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Running Negotiations</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Active negotiations and deal progress
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Counterparty / Company</TableHead>
                <TableHead className="text-xs">Vessel / Cargo / Route</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Last Activity</TableHead>
                <TableHead className="text-xs">Owner</TableHead>
                <TableHead className="text-xs">Next Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Handshake className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Negotiations module pending rollout
                    </p>
                    <Badge variant="outline" className="mt-1.5 text-[11px]">Phase 2</Badge>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
