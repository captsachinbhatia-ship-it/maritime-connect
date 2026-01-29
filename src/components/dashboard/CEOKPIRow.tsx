import { useEffect, useState } from 'react';
import { KPICard } from './KPICard';
import { Users, MessageSquare, Clock, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface CEOKPIData {
  totalActiveContacts: number;
  contactsTouchedToday: number;
  staleContacts: number;
  followUpsOverdue: number;
}

export function CEOKPIRow() {
  const [data, setData] = useState<CEOKPIData>({
    totalActiveContacts: 0,
    contactsTouchedToday: 0,
    staleContacts: 0,
    followUpsOverdue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCEOKPIs = async () => {
      setIsLoading(true);

      try {
        // Get all active assignments count
        const { count: activeCount } = await supabase
          .from('contact_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ACTIVE');

        // Get all contact IDs with active assignments
        const { data: assignments } = await supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('status', 'ACTIVE');

        const contactIds = [...new Set(assignments?.map(a => a.contact_id) || [])];

        // Contacts touched today
        let contactsTouchedToday = 0;
        if (contactIds.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const { data: todayInteractions } = await supabase
            .from('contact_interactions')
            .select('contact_id')
            .in('contact_id', contactIds)
            .gte('interaction_at', today.toISOString());
          
          contactsTouchedToday = new Set(todayInteractions?.map(i => i.contact_id) || []).size;
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
          totalActiveContacts: activeCount || 0,
          contactsTouchedToday,
          staleContacts: staleCount,
          followUpsOverdue: 0, // Placeholder
        });
      } catch (error) {
        console.error('Failed to fetch CEO KPIs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCEOKPIs();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Total Active Contacts"
        value={data.totalActiveContacts}
        icon={Users}
        variant="default"
        isLoading={isLoading}
      />
      <KPICard
        title="Contacts Touched Today"
        value={data.contactsTouchedToday}
        icon={MessageSquare}
        variant="success"
        isLoading={isLoading}
      />
      <KPICard
        title="Stale Contacts (>14 Days)"
        value={data.staleContacts}
        icon={Clock}
        variant={data.staleContacts > 0 ? 'warning' : 'muted'}
        isLoading={isLoading}
      />
      <KPICard
        title="Follow-ups Overdue"
        value={data.followUpsOverdue}
        icon={Bell}
        variant="muted"
        isLoading={isLoading}
      />
    </div>
  );
}
