import { useEffect, useState } from 'react';
import { KPICard } from './KPICard';
import { Users, UserPlus, UserCheck, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface CEOKPIData {
  totalContacts: number;
  unassignedContacts: number;
  recentlyAdded: number;
  recentlyAssigned: number;
}

export function CEOKPIRow() {
  const [data, setData] = useState<CEOKPIData>({
    totalContacts: 0,
    unassignedContacts: 0,
    recentlyAdded: 0,
    recentlyAssigned: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCEOKPIs = async () => {
      setIsLoading(true);

      try {
        // 1. Total Contacts (all active contacts)
        const { count: totalCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // 2. Unassigned Contacts (contacts without an ACTIVE PRIMARY assignment)
        // First get all contact IDs with ACTIVE PRIMARY assignments
        const { data: activePrimaryAssignments } = await supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('status', 'ACTIVE')
          .eq('assignment_role', 'PRIMARY')
          .not('assigned_to_crm_user_id', 'is', null);

        const assignedContactIds = new Set(
          (activePrimaryAssignments || []).map(a => a.contact_id)
        );

        // Get all active contacts and count unassigned
        const { data: allContacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('is_active', true);

        const unassignedCount = (allContacts || []).filter(
          c => !assignedContactIds.has(c.id)
        ).length;

        // 3. Recently Added Contacts (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: recentlyAddedCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .gte('created_at', sevenDaysAgo.toISOString());

        // 4. Recently Assigned Contacts (assignments created in last 7 days)
        const { data: recentAssignments } = await supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('status', 'ACTIVE')
          .eq('assignment_role', 'PRIMARY')
          .gte('assigned_at', sevenDaysAgo.toISOString());

        const recentlyAssignedCount = new Set(
          (recentAssignments || []).map(a => a.contact_id)
        ).size;

        setData({
          totalContacts: totalCount || 0,
          unassignedContacts: unassignedCount,
          recentlyAdded: recentlyAddedCount || 0,
          recentlyAssigned: recentlyAssignedCount,
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
        title="Total Contacts"
        value={data.totalContacts}
        icon={Users}
        variant="default"
        isLoading={isLoading}
      />
      <KPICard
        title="Unassigned Contacts"
        value={data.unassignedContacts}
        icon={Clock}
        variant={data.unassignedContacts > 0 ? 'warning' : 'success'}
        isLoading={isLoading}
      />
      <KPICard
        title="Recently Added (7d)"
        value={data.recentlyAdded}
        icon={UserPlus}
        variant="default"
        isLoading={isLoading}
      />
      <KPICard
        title="Recently Assigned (7d)"
        value={data.recentlyAssigned}
        icon={UserCheck}
        variant="success"
        isLoading={isLoading}
      />
    </div>
  );
}
