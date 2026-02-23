import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

export function useEnquiryPopup() {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('enquiries-insert-popups')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'enquiries' },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const parts: string[] = [];
          if (row.subject) parts.push(String(row.subject));
          if (row.quantity || row.quantity_unit) {
            parts.push(
              [row.quantity, row.quantity_unit].filter(Boolean).join(' ')
            );
          }
          if (row.loading_port) parts.push(`EX ${row.loading_port}`);
          if (row.discharge_port) parts.push(`TO ${row.discharge_port}`);

          toast({
            title: 'New Enquiry Received',
            description: parts.join(' | ') || 'New enquiry created',
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);
}
