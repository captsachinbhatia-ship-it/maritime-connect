import { format } from 'date-fns';
import { Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SlippingContact } from '@/services/followupsOversight';

interface SlippingContactsTableProps {
  data: SlippingContact[] | null;
  isLoading: boolean;
  error: string | null;
}

export function SlippingContactsTable({
  data,
  isLoading,
  error,
}: SlippingContactsTableProps) {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return '-';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Slipping Contacts
        </CardTitle>
        <CardDescription>
          Contacts with 2+ overdue follow-ups OR oldest overdue &gt; 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No slipping contacts</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                  <TableHead>Oldest Due</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.contactId}>
                    <TableCell className="font-medium">{row.contactName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.companyName || '-'}
                    </TableCell>
                    <TableCell>{row.assignedToName}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={
                          row.overdueCount >= 2
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : ''
                        }
                      >
                        {row.overdueCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.oldestDue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={
                          row.oldestOverdueDays > 7
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }
                      >
                        {row.oldestOverdueDays} days
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
