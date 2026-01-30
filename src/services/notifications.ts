import { supabase } from '@/lib/supabaseClient';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link_path: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export async function getUnreadCount(): Promise<{ count: number; error: string | null }> {
  try {
    const { count, error } = await supabase
      .from('app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (error) throw error;

    return { count: count ?? 0, error: null };
  } catch (err) {
    console.error('Error fetching unread count:', err);
    return { count: 0, error: err instanceof Error ? err.message : 'Failed to fetch unread count' };
  }
}

export async function getNotifications(): Promise<{ data: AppNotification[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('app_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) throw error;

    return { data: data ?? [], error: null };
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return { data: [], error: err instanceof Error ? err.message : 'Failed to fetch notifications' };
  }
}

export async function markNotificationRead(notificationId: string): Promise<{ error: string | null }> {
  try {
    // Try RPC first
    const { error: rpcError } = await supabase.rpc('rpc_mark_notification_read', {
      p_notification_id: notificationId
    });

    if (rpcError) {
      // Fallback to direct update
      const { error: updateError } = await supabase
        .from('app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (updateError) throw updateError;
    }

    return { error: null };
  } catch (err) {
    console.error('Error marking notification read:', err);
    return { error: err instanceof Error ? err.message : 'Failed to mark notification as read' };
  }
}
