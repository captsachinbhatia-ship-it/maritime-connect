import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'aq_enq_notifications_v1';
const MAX_NOTIFICATIONS = 10;

export interface EnquiryNotification {
  id: string;
  enquiry_id: string;
  enquiry_number: string;
  loading_port: string | null;
  discharge_port: string | null;
  created_by_name: string | null;
  created_at: string;
  is_read: boolean;
}

interface NotificationState {
  notifications: EnquiryNotification[];
  unreadCount: number;
}

function loadFromStorage(): EnquiryNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EnquiryNotification[];
  } catch {
    return [];
  }
}

function saveToStorage(notifications: EnquiryNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // quota exceeded – silently ignore
  }
}

export function useEnquiryNotifications() {
  const [notifications, setNotifications] = useState<EnquiryNotification[]>(() => loadFromStorage());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Derived unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Persist whenever notifications change
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  const pushNotification = useCallback((n: EnquiryNotification) => {
    setNotifications((prev) => {
      // Deduplicate by enquiry_id
      if (prev.some((existing) => existing.enquiry_id === n.enquiry_id)) return prev;
      return [n, ...prev].slice(0, MAX_NOTIFICATIONS);
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('enquiry-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'enquiries',
          filter: 'is_draft=eq.false',
        },
        async (payload) => {
          const row = payload.new as Record<string, unknown>;
          const enquiryId = row.id as string;
          const enquiryNumber = (row.enquiry_number as string) || 'New';

          // Try enriching via feed view
          let loadingPort = (row.loading_port as string) || null;
          let dischargePort = (row.discharge_port as string) || null;
          let createdByName: string | null = null;

          try {
            const { data: feedRow } = await supabase
              .from('enquiry_feed')
              .select('loading_port, discharge_port, contact_name')
              .eq('id', enquiryId)
              .maybeSingle();

            if (feedRow) {
              loadingPort = feedRow.loading_port || loadingPort;
              dischargePort = feedRow.discharge_port || dischargePort;
              createdByName = feedRow.contact_name || null;
            }
          } catch {
            // fallback – use raw payload fields
          }

          // If we still have no creator name, try crm_users
          if (!createdByName && row.created_by) {
            try {
              const { data: user } = await supabase
                .from('crm_users')
                .select('full_name')
                .eq('id', row.created_by as string)
                .maybeSingle();
              if (user) createdByName = user.full_name;
            } catch {
              // ignore
            }
          }

          const notification: EnquiryNotification = {
            id: crypto.randomUUID(),
            enquiry_id: enquiryId,
            enquiry_number: enquiryNumber,
            loading_port: loadingPort,
            discharge_port: dischargePort,
            created_by_name: createdByName || 'Unknown',
            created_at: (row.created_at as string) || new Date().toISOString(),
            is_read: false,
          };

          pushNotification(notification);

          // Toast
          toast({
            title: '🔔 New Enquiry',
            description: `${enquiryNumber} | ${loadingPort ?? '—'} → ${dischargePort ?? '—'}`,
            duration: 10000,
          });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          toast({
            title: 'Live updates paused',
            description: 'Reconnecting…',
            duration: 5000,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [pushNotification]);

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    pushNotification,
  } as const;
}
