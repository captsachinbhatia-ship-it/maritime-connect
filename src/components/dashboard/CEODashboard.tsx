import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CEOKPIRow } from './CEOKPIRow';
import { PipelineHealth } from './PipelineHealth';
import { TeamActivitySnapshot } from './TeamActivitySnapshot';
import { RiskNeglectList } from './RiskNeglectList';
import { RecentCompanies } from './RecentCompanies';
import { ModeIndicator } from './ModeIndicator';
import { PendingStageRequests } from './PendingStageRequests';
import { UnassignedContactsList } from './UnassignedContactsList';
import { ActivityMatrix } from './ActivityMatrix';
import { DashboardLineChart } from './DashboardLineChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';

interface CEODashboardProps {
  isAdmin: boolean;
  isCEO: boolean;
}

interface CrmUserOption {
  id: string;
  full_name: string;
}

export function CEODashboard({ isAdmin, isCEO }: CEODashboardProps) {
  const [userFilter, setUserFilter] = useState<string>('all');
  const [crmUsers, setCrmUsers] = useState<CrmUserOption[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('crm_users')
        .select('id, full_name')
        .eq('active', true)
        .order('full_name');
      setCrmUsers((data || []).map(u => ({ id: u.id, full_name: u.full_name || 'Unknown' })));
    };
    fetchUsers();
  }, []);

  const selectedUserId = userFilter === 'all' ? null : userFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Management Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Company-wide overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {crmUsers.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && <ModeIndicator isCEO={isCEO} />}
        </div>
      </div>

      {/* Global KPI Row */}
      <CEOKPIRow />

      {/* Line Chart */}
      <DashboardLineChart crmUserId={selectedUserId} isPersonal={false} />

      {/* Activity Matrix */}
      <ActivityMatrix />

      {/* Pending Stage Requests */}
      <PendingStageRequests />

      {/* Unassigned Contacts */}
      <UnassignedContactsList />

      {/* Pipeline Health */}
      <PipelineHealth />

      {/* Secondary Panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TeamActivitySnapshot />
        <RiskNeglectList />
      </div>

      {/* Recent Companies */}
      <RecentCompanies />
    </div>
  );
}
