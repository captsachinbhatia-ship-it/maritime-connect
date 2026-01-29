import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, AlertCircle, PhoneCall, Mail, Video, MessageSquare, CalendarClock } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { getOverdueByCallerId, CallerFollowupDrilldown } from '@/services/followupsOversight';

interface CallerDrilldownDrawerProps {
  callerId: string | null;
  callerName: string;
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  MEETING: <Video className="h-3 w-3" />,
  WHATSAPP: <MessageSquare className="h-3 w-3" />,
  OTHER: <CalendarClock className="h-3 w-3" />,
};

export function CallerDrilldownDrawer({
  callerId,
  callerName,
  isOpen,
  onClose,
}: CallerDrilldownDrawerProps) {
  const [data, setData] = useState<CallerFollowupDrilldown[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && callerId) {
      loadData();
    }
  }, [isOpen, callerId]);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
    }
  }, [isOpen]);

  const loadData = async () => {
    if (!callerId) return;

    setIsLoading(true);
    setError(null);

    const result = await getOverdueByCallerId(callerId);

    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return '-';
    }
  };

  const getDaysOverdue = (dateStr: string) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDate = new Date(dateStr);
    return Math.floor((startOfToday.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-hidden p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Overdue Follow-ups</SheetTitle>
          <SheetDescription>
            Viewing overdue items for: <strong>{callerName}</strong>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : !data || data.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No overdue follow-ups for this caller</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table className="min-w-[550px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Due</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => {
                      const daysOverdue = getDaysOverdue(row.dueAt);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-sm">{formatDate(row.dueAt)}</div>
                              <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                {daysOverdue} days overdue
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{row.contactName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.companyName || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {TYPE_ICONS[row.followupType]}
                              <span className="text-sm">{row.followupType}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm max-w-[200px] truncate" title={row.followupReason}>
                              {row.followupReason}
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
