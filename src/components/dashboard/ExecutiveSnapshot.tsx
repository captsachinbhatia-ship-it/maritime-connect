import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useCrmUser } from '@/hooks/useCrmUser';
import { KPICard } from './KPICard';
import { Users, UserX, UserCheck, Archive, Building2 } from 'lucide-react';

interface SnapshotCounts {
  active: number;
  unassigned: number;
  myPrimary: number;
  inactive: number;
  companies: number;
}

export function ExecutiveSnapshot() {
  const { crmUserId } = useCrmUser();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<SnapshotCounts>({ active: 0, unassigned: 0, myPrimary: 0, inactive: 0, companies: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [activeRes, unassignedRes, inactiveRes, companiesRes, myPrimaryRes] = await Promise.all([
          // Active contacts (is_active=true, not deleted) — head count
          supabase.from('v_directory_contacts_ro').select('*', { count: 'exact', head: true }),
          // Unassigned (is_active=true, no primary owner)
          supabase.from('v_directory_contacts_ro').select('*', { count: 'exact', head: true }).is('primary_owner_id', null),
          // Inactive
          supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('is_active', false).or('is_deleted.is.null,is_deleted.eq.false').or('deleted_at.is.null'),
          // Companies total
          supabase.from('companies').select('*', { count: 'exact', head: true }),
          // My Primary
          crmUserId
            ? supabase.from('contact_assignments').select('*', { count: 'exact', head: true }).eq('assigned_to_crm_user_id', crmUserId).eq('assignment_role', 'PRIMARY').eq('status', 'ACTIVE').is('ended_at', null)
            : Promise.resolve({ count: 0 } as any),
        ]);

        setCounts({
          active: activeRes.count ?? 0,
          unassigned: unassignedRes.count ?? 0,
          myPrimary: myPrimaryRes.count ?? 0,
          inactive: inactiveRes.count ?? 0,
          companies: companiesRes.count ?? 0,
        });
      } catch (err) {
        console.error('Executive snapshot error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [crmUserId]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <KPICard
        title="Active Contacts"
        value={counts.active}
        icon={Users}
        variant="success"
        isLoading={loading}
        onClick={() => navigate('/contacts-v2')}
      />
      <KPICard
        title="Unassigned"
        value={counts.unassigned}
        icon={UserX}
        variant="warning"
        isLoading={loading}
        onClick={() => navigate('/contacts-v2?tab=directory&filter=unassigned')}
      />
      <KPICard
        title="My Primary"
        value={counts.myPrimary}
        icon={UserCheck}
        variant="default"
        isLoading={loading}
        onClick={() => navigate('/contacts-v2?tab=my-primary')}
      />
      <KPICard
        title="Inactive"
        value={counts.inactive}
        icon={Archive}
        variant="muted"
        isLoading={loading}
        onClick={() => navigate('/contacts-v2?tab=inactive')}
      />
      <KPICard
        title="Companies"
        value={counts.companies}
        icon={Building2}
        variant="default"
        isLoading={loading}
        onClick={() => navigate('/companies')}
      />
    </div>
  );
}
