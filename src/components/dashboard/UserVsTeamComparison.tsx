import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Users2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { toast } from '@/hooks/use-toast';
import { subDays } from 'date-fns';

/* ──────────────────────── types ──────────────────────── */

type Period = 'today' | '7d' | '30d';

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
];

interface ComparisonRow {
  label: string;
  section: 'growth' | 'engagement' | 'commercial';
  myValue: number;
  teamValue: number;
  myRoute: string;
  myRouteParams?: Record<string, string>;
  teamRoute: string;
  teamRouteParams?: Record<string, string>;
  notLive?: boolean;
}

/* ──────────────────────── helpers ──────────────────────── */

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function periodStart(period: Period): Date {
  const today = startOfDay(new Date());
  const cfg = PERIODS.find(p => p.key === period)!;
  return cfg.days === 0 ? today : subDays(today, cfg.days);
}

function countSince(
  items: { created_at?: string | null }[],
  since: Date
): number {
  return items.filter(i => i.created_at && new Date(i.created_at) >= since).length;
}

function distinctContactsSince(
  interactions: { contact_id: string; interaction_at: string | null }[],
  contactIds: Set<string>,
  since: Date
): number {
  const seen = new Set<string>();
  interactions.forEach(i => {
    if (i.interaction_at && new Date(i.interaction_at) >= since && contactIds.has(i.contact_id)) {
      seen.add(i.contact_id);
    }
  });
  return seen.size;
}

/* ──────────────────────── component ──────────────────────── */

interface UserVsTeamComparisonProps {
  isCEO: boolean;
  isAdmin: boolean;
}

export function UserVsTeamComparison({ isCEO, isAdmin }: UserVsTeamComparisonProps) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('today');
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isVisible = isCEO || isAdmin;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
      if (crmError || !currentCrmUserId) {
        setIsLoading(false);
        return;
      }

      const since = periodStart(period);
      const sinceISO = since.toISOString();

      // Parallel fetches — my data + team data
      const [
        myContactsRes, teamContactsRes,
        myCompaniesRes, teamCompaniesRes,
        myAssignmentsRes, allAssignmentsRes,
        myInteractionsRes, allInteractionsRes,
      ] = await Promise.all([
        // My contacts
        supabase.from('contacts').select('id, created_at')
          .eq('created_by_crm_user_id', currentCrmUserId)
          .gte('created_at', sinceISO),
        // Team contacts
        supabase.from('contacts').select('id, created_at')
          .gte('created_at', sinceISO),
        // My companies
        supabase.from('companies').select('id, created_at')
          .eq('created_by_crm_user_id', currentCrmUserId)
          .gte('created_at', sinceISO),
        // Team companies
        supabase.from('companies').select('id, created_at')
          .gte('created_at', sinceISO),
        // My assignments
        supabase.from('contact_assignments').select('contact_id, stage')
          .eq('status', 'ACTIVE')
          .eq('assigned_to_crm_user_id', currentCrmUserId)
          .eq('assignment_role', 'primary'),
        // All assignments
        supabase.from('contact_assignments').select('contact_id, stage, assigned_to_crm_user_id')
          .eq('status', 'ACTIVE')
          .eq('assignment_role', 'primary'),
        // My interactions (via assigned contacts — will filter client-side)
        supabase.from('v_contact_interactions_timeline').select('contact_id, interaction_at')
          .gte('interaction_at', sinceISO),
        // Same for team — same query, different filter below
        { data: null }, // reuse myInteractionsRes for team too
      ]);

      const myContacts = myContactsRes.data || [];
      const teamContacts = teamContactsRes.data || [];
      const myCompanies = myCompaniesRes.data || [];
      const teamCompanies = teamCompaniesRes.data || [];
      const myAssignments = myAssignmentsRes.data || [];
      const allAssignments = allAssignmentsRes.data || [];
      const allInteractions = myInteractionsRes.data || [];

      // Build my stage sets
      const myStageContacts: Record<string, Set<string>> = {
        COLD_CALLING: new Set(), ASPIRATION: new Set(), ACHIEVEMENT: new Set(),
      };
      myAssignments.forEach(a => {
        if (myStageContacts[a.stage]) myStageContacts[a.stage].add(a.contact_id);
      });

      // Build team stage sets
      const teamStageContacts: Record<string, Set<string>> = {
        COLD_CALLING: new Set(), ASPIRATION: new Set(), ACHIEVEMENT: new Set(),
      };
      allAssignments.forEach(a => {
        if (teamStageContacts[a.stage]) teamStageContacts[a.stage].add(a.contact_id);
      });

      const myAssignedIds = new Set(myAssignments.map(a => a.contact_id));
      const allAssignedIds = new Set(allAssignments.map(a => a.contact_id));

      const myInteractions = allInteractions.filter(i => myAssignedIds.has(i.contact_id));

      const compRows: ComparisonRow[] = [
        {
          label: 'New Contacts Added',
          section: 'growth',
          myValue: countSince(myContacts, since),
          teamValue: countSince(teamContacts, since),
          myRoute: '/contacts',
          myRouteParams: { tab: 'my-added' },
          teamRoute: '/contacts',
          teamRouteParams: { tab: 'all' },
        },
        {
          label: 'New Companies Approached',
          section: 'growth',
          myValue: countSince(myCompanies, since),
          teamValue: countSince(teamCompanies, since),
          myRoute: '/companies',
          teamRoute: '/companies',
        },
        {
          label: 'Cold Calling Touch-Based',
          section: 'engagement',
          myValue: distinctContactsSince(myInteractions, myStageContacts.COLD_CALLING, since),
          teamValue: distinctContactsSince(allInteractions, teamStageContacts.COLD_CALLING, since),
          myRoute: '/contacts',
          myRouteParams: { tab: 'my-contacts' },
          teamRoute: '/contacts',
          teamRouteParams: { tab: 'all' },
        },
        {
          label: 'Aspiration Touch-Based',
          section: 'engagement',
          myValue: distinctContactsSince(myInteractions, myStageContacts.ASPIRATION, since),
          teamValue: distinctContactsSince(allInteractions, teamStageContacts.ASPIRATION, since),
          myRoute: '/contacts',
          myRouteParams: { tab: 'my-contacts' },
          teamRoute: '/contacts',
          teamRouteParams: { tab: 'all' },
        },
        {
          label: 'Achievement Touch-Based',
          section: 'engagement',
          myValue: distinctContactsSince(myInteractions, myStageContacts.ACHIEVEMENT, since),
          teamValue: distinctContactsSince(allInteractions, teamStageContacts.ACHIEVEMENT, since),
          myRoute: '/contacts',
          myRouteParams: { tab: 'my-contacts' },
          teamRoute: '/contacts',
          teamRouteParams: { tab: 'all' },
        },
        {
          label: 'Cargo Enquiries Raised',
          section: 'commercial',
          myValue: 0, teamValue: 0,
          myRoute: '/enquiries', teamRoute: '/enquiries', notLive: true,
        },
        {
          label: 'Vessels Offered',
          section: 'commercial',
          myValue: 0, teamValue: 0,
          myRoute: '/enquiries', teamRoute: '/enquiries', notLive: true,
        },
        {
          label: 'Vessels Put on Subs',
          section: 'commercial',
          myValue: 0, teamValue: 0,
          myRoute: '/enquiries', teamRoute: '/enquiries', notLive: true,
        },
        {
          label: 'Cargo Covered',
          section: 'commercial',
          myValue: 0, teamValue: 0,
          myRoute: '/enquiries', teamRoute: '/enquiries', notLive: true,
        },
        {
          label: 'Deals Lost',
          section: 'commercial',
          myValue: 0, teamValue: 0,
          myRoute: '/enquiries', teamRoute: '/enquiries', notLive: true,
        },
      ];

      setRows(compRows);
    } catch (err) {
      console.error('UserVsTeamComparison error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (isVisible) fetchData();
  }, [fetchData, isVisible]);

  // Only visible to CEO/Admin — guard AFTER hooks
  if (!isVisible) return null;

  const handleClick = (route: string, params?: Record<string, string>, notLive?: boolean) => {
    if (notLive) {
      toast({ title: 'Module not live yet', description: 'This module is pending rollout.' });
      return;
    }
    const search = new URLSearchParams(params || {});
    navigate(`${route}${search.toString() ? '?' + search.toString() : ''}`);
  };

  const sectionLabels: Record<string, string> = {
    growth: 'Growth',
    engagement: 'Engagement by Stage',
    commercial: 'Commercial / Deal Activity',
  };

  let lastSection = '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <Users2 className="h-4.5 w-4.5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">User vs Team Performance</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Click numbers to open filtered lists
              </p>
            </div>
          </div>
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(v) => v && setPeriod(v as Period)}
            size="sm"
            className="h-7"
          >
            {PERIODS.map(p => (
              <ToggleGroupItem key={p.key} value={p.key} className="text-xs px-2.5 h-7">
                {p.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 min-w-[200px]">
                    Metric
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">
                    My Numbers
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">
                    Team Total
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">
                    My % of Team
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const showSection = row.section !== lastSection;
                  lastSection = row.section;
                  const pct = row.teamValue > 0
                    ? Math.round((row.myValue / row.teamValue) * 100)
                    : row.myValue > 0 ? 100 : 0;

                  return (
                    <ComparisonTableRow
                      key={row.label}
                      row={row}
                      pct={pct}
                      showSection={showSection}
                      sectionLabel={sectionLabels[row.section]}
                      onMyClick={() => handleClick(row.myRoute, row.myRouteParams, row.notLive)}
                      onTeamClick={() => handleClick(row.teamRoute, row.teamRouteParams, row.notLive)}
                      isLast={idx === rows.length - 1}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────── sub-components ──────────────────────── */

function ComparisonTableRow({
  row,
  pct,
  showSection,
  sectionLabel,
  onMyClick,
  onTeamClick,
  isLast,
}: {
  row: ComparisonRow;
  pct: number;
  showSection: boolean;
  sectionLabel: string;
  onMyClick: () => void;
  onTeamClick: () => void;
  isLast: boolean;
}) {
  return (
    <>
      {showSection && (
        <tr>
          <td
            colSpan={4}
            className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30 border-b"
          >
            {sectionLabel}
          </td>
        </tr>
      )}
      <tr className={`hover:bg-muted/40 transition-colors ${!isLast ? 'border-b border-border/50' : ''}`}>
        <td className="px-3 py-2 text-sm font-medium text-foreground">
          {row.label}
        </td>
        <td className="px-3 py-2 text-right">
          <span
            className="cursor-pointer tabular-nums text-sm font-medium text-primary hover:underline transition-colors"
            onClick={onMyClick}
          >
            {row.myValue}
          </span>
        </td>
        <td className="px-3 py-2 text-right">
          <span
            className="cursor-pointer tabular-nums text-sm font-medium text-primary hover:underline transition-colors"
            onClick={onTeamClick}
          >
            {row.teamValue}
          </span>
        </td>
        <td className="px-3 py-2 text-right tabular-nums text-sm text-muted-foreground">
          {pct}%
        </td>
      </tr>
    </>
  );
}
