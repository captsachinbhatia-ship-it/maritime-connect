import { useEffect, useState } from 'react';
import { KPICard } from './KPICard';
import { Users, MessageSquare, Clock, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface KPIData {
  activeContacts: number;
  interactionsToday: number;
  staleContacts: number;
  followUpsDue: number;
}

export function KPIRow() {
  const [data, setData] = useState<KPIData>({
    activeContacts: 0,
    interactionsToday: 0,
    staleContacts: 0,
    followUpsDue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      setIsLoading(true);

      try {
        // RLS enforces visibility - fetch active assignments directly
        const { data: assignments, count: activeCount } = await supabase
          .from('contact_assignments')
          .select('contact_id', { count: 'exact' })
          .eq('status', 'ACTIVE');

        const contactIds = assignments?.map(a => a.contact_id) || [];

        // Interactions today
        let interactionsToday = 0;
        if (contactIds.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const { count } = await supabase
            .from('contact_interactions')
            .select('*', { count: 'exact', head: true })
            .in('contact_id', contactIds)
            .gte('interaction_at', today.toISOString());
          
          interactionsToday = count || 0;
        }

        // Stale contacts (no activity in 14 days)
        let staleCount = 0;
        if (contactIds.length > 0) {
          const fourteenDaysAgo = new Date();
          fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

          const { data: lastInteractions } = await supabase
            .from('v_contacts_last_interaction')
            .select('contact_id, last_interaction_at')
            .in('contact_id', contactIds);

          const interactionMap = new Map(
            lastInteractions?.map(li => [li.contact_id, li.last_interaction_at]) || []
          );

          staleCount = contactIds.filter(id => {
            const lastAt = interactionMap.get(id);
            if (!lastAt) return true;
            return new Date(lastAt) < fourteenDaysAgo;
          }).length;
        }

        setData({
          activeContacts: activeCount || 0,
          interactionsToday,
          staleContacts: staleCount,
          followUpsDue: 0, // Placeholder
        });
      } catch (error) {
        console.error('Failed to fetch KPIs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="My Active Contacts"
        value={data.activeContacts}
        icon={Users}
        variant="default"
        isLoading={isLoading}
      />
      <KPICard
        title="Interactions Today"
        value={data.interactionsToday}
        icon={MessageSquare}
        variant="success"
        isLoading={isLoading}
      />
      <KPICard
        title="No Activity (14 Days)"
        value={data.staleContacts}
        icon={Clock}
        variant={data.staleContacts > 0 ? 'warning' : 'muted'}
        isLoading={isLoading}
      />
      <KPICard
        title="Follow-ups Due"
        value={data.followUpsDue}
        icon={Bell}
        variant="muted"
        isLoading={isLoading}
      />
    </div>
  );
}
