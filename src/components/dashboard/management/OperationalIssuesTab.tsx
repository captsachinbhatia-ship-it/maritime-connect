import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

export function OperationalIssuesTab() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
            <AlertCircle className="h-4.5 w-4.5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-base">Operational Issues</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Open operational items requiring attention
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Issue Title</TableHead>
                <TableHead className="text-xs">Severity</TableHead>
                <TableHead className="text-xs">Linked Contact / Company</TableHead>
                <TableHead className="text-xs">Owner</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <div className="flex flex-col items-center justify-center text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Operational issues module pending rollout
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
