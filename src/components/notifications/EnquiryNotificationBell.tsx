import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useEnquiryNotifications, type EnquiryNotification } from '@/hooks/useEnquiryNotifications';

export function EnquiryNotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useEnquiryNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleView = (n: EnquiryNotification) => {
    markRead(n.id);
    setIsOpen(false);
    navigate(`/enquiries/${n.enquiry_id}`);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Enquiry notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold text-sm">Enquiry Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={markAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                setIsOpen(false);
                navigate('/enquiries');
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              See all
            </Button>
          </div>
        </div>

        {/* List */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No enquiry notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleView(n)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-accent transition-colors',
                    !n.is_read && 'bg-accent/50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 flex-shrink-0">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          n.is_read ? 'bg-transparent' : 'bg-primary'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className={cn('text-sm', !n.is_read && 'font-medium')}>
                        🔔 New Enquiry
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {n.enquiry_number} | {n.loading_port ?? '—'} → {n.discharge_port ?? '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created by: {n.created_by_name ?? 'Unknown'} ·{' '}
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs flex-shrink-0 mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(n);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
