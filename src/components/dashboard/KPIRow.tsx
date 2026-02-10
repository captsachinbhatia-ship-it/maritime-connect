import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KPICard } from './KPICard';
import { Users, Clock, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';

interface KPIData {
  activeContacts: number;
  staleContacts: number;
  followUpsDue: number;
}

interface KPIRowProps {
  /** undefined = logged-in user, null = all users, string = specific user */
  crmUserId?: string | null;
}

export function KPIRow({ crmUserId: crmUserIdProp }: KPIRowProps = {}) {
  const navigate = useNavigate();
  const [data, setData] = useState<KPIData>({
    activeContacts: 0,
    staleContacts: 0,
    followUpsDue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      setIsLoading(true);

      try {
        let userId: string | null = null;

        if (crmUserIdProp === undefined) {
          const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
          if (crmError || !currentCrmUserId) {
            setIsLoading(false);
            return;
          }
          userId = currentCrmUserId;
        } else {
          userId = crmUserIdProp;
        }

        let assignQuery = supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('status', 'ACTIVE')
          .in('assignment_role', ['PRIMARY', 'SECONDARY']);

        if (userId) {
          assignQuery = assignQuery.eq('assigned_to_crm_user_id', userId);
        }

        const { data: assignments } = await assignQuery;
        const contactIds = [...new Set(assignments?.map(a => a.contact_id) || [])];

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

        // Follow-ups due today
        let followUpsDue = 0;
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (contactIds.length > 0) {
          const { count } = await supabase
            .from('contact_followups')
            .select('*', { count: 'exact', head: true })
            .in('contact_id', contactIds)
            .eq('status', 'OPEN')
            .lte('due_at', today.toISOString());

          followUpsDue = count || 0;
        } else if (!userId) {
          // Cumulative mode with no specific contacts — count all open followups
          const { count } = await supabase
            .from('contact_followups')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'OPEN')
            .lte('due_at', today.toISOString());

          followUpsDue = count || 0;
        }

        setData({
          activeContacts: contactIds.length,
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
  }, [crmUserIdProp]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <KPICard
        title="Active Contacts"
        value={data.activeContacts}
        icon={Users}
        variant="default"
        isLoading={isLoading}
        onClick={() => navigate('/contacts?tab=my-contacts')}
      />
      <KPICard
        title="Stale (>14 Days)"
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
        onClick={() => navigate('/followups')}
      />
    </div>
  );
}
