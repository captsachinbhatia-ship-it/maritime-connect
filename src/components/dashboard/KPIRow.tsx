import { useEffect, useState } from 'react';
import { KPICard } from './KPICard';
import { Users, MessageSquare, Clock, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';

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
        // Get current user's CRM ID for filtering
        const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
        
        if (crmError || !currentCrmUserId) {
          console.error('Failed to get CRM user ID:', crmError);
          setIsLoading(false);
          return;
        }

        // Fetch only assignments where current user is PRIMARY or SECONDARY owner
        const { data: assignments, count: activeCount } = await supabase
          .from('contact_assignments')
          .select('contact_id', { count: 'exact' })
          .eq('status', 'ACTIVE')
          .eq('assigned_to_crm_user_id', currentCrmUserId)
          .in('assignment_role', ['PRIMARY', 'SECONDARY']);

        const contactIds = [...new Set(assignments?.map(a => a.contact_id) || [])];

        // Interactions today (only for my contacts)
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

        // Stale contacts (no activity in 14 days) - only my contacts
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

        // Follow-ups due today (only for my contacts)
        let followUpsDue = 0;
        if (contactIds.length > 0) {
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          
          const { count } = await supabase
            .from('contact_followups')
            .select('*', { count: 'exact', head: true })
            .in('contact_id', contactIds)
            .eq('status', 'OPEN')
            .lte('due_at', today.toISOString());
          
          followUpsDue = count || 0;
        }

        setData({
          activeContacts: contactIds.length,
          interactionsToday,
          staleContacts: staleCount,
          followUpsDue,
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
