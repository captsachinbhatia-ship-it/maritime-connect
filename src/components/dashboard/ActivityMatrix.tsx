import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutGrid } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { toast } from '@/hooks/use-toast';
import { subDays } from 'date-fns';

/* ──────────────────────── types ──────────────────────── */

type TimeWindow = 'today' | '3d' | '7d' | '14d' | '30d';

const TIME_WINDOWS: { key: TimeWindow; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '3d', label: 'Last 3 Days', days: 3 },
  { key: '7d', label: 'Last 7 Days', days: 7 },
  { key: '14d', label: 'Last 14 Days', days: 14 },
  { key: '30d', label: 'Last 30 Days', days: 30 },
];

interface MatrixRow {
  label: string;
  section: 'growth' | 'engagement' | 'commercial';
  values: Record<TimeWindow, number>;
  route: string;
  routeParams?: Record<string, string>;
  notLive?: boolean;
}

/* ──────────────────────── helpers ──────────────────────── */

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function windowStart(windowKey: TimeWindow): Date {
  const today = startOfDay(new Date());
  const cfg = TIME_WINDOWS.find(w => w.key === windowKey)!;
  return cfg.days === 0 ? today : subDays(today, cfg.days);
}

function countInWindow(
  items: { created_at?: string | null; interaction_at?: string | null }[],
  dateField: 'created_at' | 'interaction_at',
  windowKey: TimeWindow
): number {
  const start = windowStart(windowKey);
  return items.filter(item => {
    const val = item[dateField];
    return val && new Date(val) >= start;
  }).length;
}

function distinctContactsInWindow(
  interactions: { contact_id: string; interaction_at: string | null }[],
  contactIds: Set<string>,
  windowKey: TimeWindow
): number {
  const start = windowStart(windowKey);
  const seen = new Set<string>();
  interactions.forEach(i => {
    if (i.interaction_at && new Date(i.interaction_at) >= start && contactIds.has(i.contact_id)) {
      seen.add(i.contact_id);
    }
  });
  return seen.size;
}

/* ──────────────────────── component ──────────────────────── */

interface ActivityMatrixProps {
  /** undefined = logged-in user, null = all users, string = specific user */
  crmUserId?: string | null;
}

export function ActivityMatrix({ crmUserId: crmUserIdProp }: ActivityMatrixProps = {}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
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

      const thirtyDaysAgo = subDays(startOfDay(new Date()), 30).toISOString();

      // Build queries with conditional user filters
      let contactsQuery = supabase
        .from('contacts')
        .select('id, created_at')
        .gte('created_at', thirtyDaysAgo);
      if (userId) contactsQuery = contactsQuery.eq('created_by_crm_user_id', userId);

      let companiesQuery = supabase
        .from('companies')
        .select('id, created_at')
        .gte('created_at', thirtyDaysAgo);
      if (userId) companiesQuery = companiesQuery.eq('created_by_crm_user_id', userId);

      let assignmentsQuery = supabase
        .from('contact_assignments')
        .select('contact_id, stage')
        .eq('status', 'ACTIVE')
        .eq('assignment_role', 'primary');
      if (userId) assignmentsQuery = assignmentsQuery.eq('assigned_to_crm_user_id', userId);

      // Parallel fetches
      const [contactsRes, companiesRes, assignmentsRes, interactionsRes] = await Promise.all([
        contactsQuery,
        companiesQuery,
        assignmentsQuery,
        supabase
          .from('v_contact_interactions_timeline')
          .select('contact_id, interaction_at')
          .gte('interaction_at', thirtyDaysAgo),
      ]);

      const contacts = contactsRes.data || [];
      const companies = companiesRes.data || [];
      const assignments = assignmentsRes.data || [];
      const interactions = interactionsRes.data || [];

      // Build stage contact sets
      const stageContacts: Record<string, Set<string>> = {
        COLD_CALLING: new Set(),
        ASPIRATION: new Set(),
        ACHIEVEMENT: new Set(),
      };
      assignments.forEach(a => {
        if (stageContacts[a.stage]) stageContacts[a.stage].add(a.contact_id);
      });

      // Filter interactions to only assigned contacts
      const allAssignedIds = new Set(assignments.map(a => a.contact_id));
      const filteredInteractions = interactions.filter(i => allAssignedIds.has(i.contact_id));

      // Build values for each time window
      const buildValues = (
        fn: (w: TimeWindow) => number
      ): Record<TimeWindow, number> => {
        const result = {} as Record<TimeWindow, number>;
        TIME_WINDOWS.forEach(tw => { result[tw.key] = fn(tw.key); });
        return result;
      };

      const matrixRows: MatrixRow[] = [
        // Section A — Growth
        {
          label: 'New Contacts Added',
          section: 'growth',
          values: buildValues(w => countInWindow(contacts, 'created_at', w)),
          route: '/contacts',
          routeParams: { tab: 'my-added' },
        },
        {
          label: 'New Companies Added',
          section: 'growth',
          values: buildValues(w => countInWindow(companies, 'created_at', w)),
          route: '/companies',
        },
        // Section B — Engagement by Stage
        {
          label: 'Cold Calling Touch-Based',
          section: 'engagement',
          values: buildValues(w => distinctContactsInWindow(filteredInteractions, stageContacts.COLD_CALLING, w)),
          route: '/contacts',
          routeParams: { tab: 'my-contacts' },
        },
        {
          label: 'Aspiration Touch-Based',
          section: 'engagement',
          values: buildValues(w => distinctContactsInWindow(filteredInteractions, stageContacts.ASPIRATION, w)),
          route: '/contacts',
          routeParams: { tab: 'my-contacts' },
        },
        {
          label: 'Achievement Touch-Based',
          section: 'engagement',
          values: buildValues(w => distinctContactsInWindow(filteredInteractions, stageContacts.ACHIEVEMENT, w)),
          route: '/contacts',
          routeParams: { tab: 'my-contacts' },
        },
        // Section C — Commercial / Deal Activity (not live yet)
        {
          label: 'Cargo Enquiries Raised',
          section: 'commercial',
          values: buildValues(() => 0),
          route: '/enquiries',
          notLive: true,
        },
        {
          label: 'Vessels Offered',
          section: 'commercial',
          values: buildValues(() => 0),
          route: '/enquiries',
          notLive: true,
        },
        {
          label: 'Vessels Put on Subs',
          section: 'commercial',
          values: buildValues(() => 0),
          route: '/enquiries',
          notLive: true,
        },
        {
          label: 'Cargo Covered',
          section: 'commercial',
          values: buildValues(() => 0),
          route: '/enquiries',
          notLive: true,
        },
        {
          label: 'Deals Lost',
          section: 'commercial',
          values: buildValues(() => 0),
          route: '/enquiries',
          notLive: true,
        },
      ];

      setRows(matrixRows);
    } catch (err) {
      console.error('ActivityMatrix error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [crmUserIdProp]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCellClick = (row: MatrixRow, _window: TimeWindow) => {
    if (row.notLive) {
      toast({ title: 'Module not live yet', description: 'This module is pending rollout.' });
      return;
    }
    const params = new URLSearchParams(row.routeParams || {});
    navigate(`${row.route}${params.toString() ? '?' + params.toString() : ''}`);
  };

  // Section headers
  const sectionLabels: Record<string, string> = {
    growth: 'Growth',
    engagement: 'Engagement by Stage',
    commercial: 'Commercial / Deal Activity',
  };

  let lastSection = '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <LayoutGrid className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Activity Matrix</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Click any number to open the filtered list
            </p>
          </div>
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
                  {TIME_WINDOWS.map(tw => (
                    <th
                      key={tw.key}
                      className="text-right text-xs font-medium text-muted-foreground px-3 py-2 whitespace-nowrap"
                    >
                      {tw.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const showSection = row.section !== lastSection;
                  lastSection = row.section;

                  return (
                    <SectionAndRow
                      key={row.label}
                      row={row}
                      showSection={showSection}
                      sectionLabel={sectionLabels[row.section]}
                      onCellClick={handleCellClick}
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

function SectionAndRow({
  row,
  showSection,
  sectionLabel,
  onCellClick,
  isLast,
}: {
  row: MatrixRow;
  showSection: boolean;
  sectionLabel: string;
  onCellClick: (row: MatrixRow, window: TimeWindow) => void;
  isLast: boolean;
}) {
  return (
    <>
      {showSection && (
        <tr>
          <td
            colSpan={TIME_WINDOWS.length + 1}
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
        {TIME_WINDOWS.map(tw => (
          <td key={tw.key} className="px-3 py-2 text-right">
            <span
              className="cursor-pointer tabular-nums text-sm font-medium text-primary hover:underline transition-colors"
              onClick={() => onCellClick(row, tw.key)}
            >
              {row.values[tw.key]}
            </span>
          </td>
        ))}
      </tr>
    </>
  );
}
