import { format } from 'date-fns';
import { Loader2, AlertCircle, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Next7DaysFollowup } from '@/services/followupsOversight';

interface Next7DaysTableProps {
  data: Next7DaysFollowup[] | null;
  isLoading: boolean;
  error: string | null;
}

export function Next7DaysTable({
  data,
  isLoading,
  error,
}: Next7DaysTableProps) {
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return '-';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CALL':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'EMAIL':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'MEETING':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'WHATSAPP':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <CardTitle className="text-lg">Next 7 Days</CardTitle>
        </div>
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
            <CalendarClock className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No OPEN follow-ups in the next 7 days</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Due Date</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {formatDate(row.dueAt)}
                    </TableCell>
                    <TableCell>{row.contactName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.companyName || '-'}
                    </TableCell>
                    <TableCell>{row.callerName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getTypeColor(row.followupType)}>
                        {row.followupType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {row.followupReason}
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
