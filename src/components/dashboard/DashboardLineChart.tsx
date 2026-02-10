import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { subDays, format } from 'date-fns';

type Category = 'growth' | 'engagement' | 'commercial';

interface DayPoint {
  date: string;
  dateLabel: string;
  [key: string]: unknown;
}

const CATEGORY_CONFIG: Record<Category, { label: string; lines: { key: string; label: string; color: string }[] }> = {
  growth: {
    label: 'Growth',
    lines: [
      { key: 'contactsAdded', label: 'New Contacts Added', color: 'hsl(215, 80%, 45%)' },
      { key: 'companiesAdded', label: 'New Companies Added', color: 'hsl(152, 69%, 40%)' },
    ],
  },
  engagement: {
    label: 'Engagement by Stage',
    lines: [
      { key: 'coldCalling', label: 'Cold Calling Touch-Based', color: 'hsl(215, 70%, 50%)' },
      { key: 'aspiration', label: 'Aspiration Touch-Based', color: 'hsl(40, 90%, 50%)' },
      { key: 'achievement', label: 'Achievement Touch-Based', color: 'hsl(152, 69%, 40%)' },
    ],
  },
  commercial: {
    label: 'Commercial / Deal Activity',
    lines: [
      { key: 'enquiries', label: 'Cargo Enquiries Raised', color: 'hsl(215, 70%, 50%)' },
      { key: 'offered', label: 'Vessels Offered', color: 'hsl(40, 90%, 50%)' },
      { key: 'subs', label: 'Vessels Put on Subs', color: 'hsl(152, 69%, 40%)' },
      { key: 'covered', label: 'Cargo Covered', color: 'hsl(280, 60%, 50%)' },
      { key: 'lost', label: 'Deals Lost', color: 'hsl(0, 70%, 50%)' },
    ],
  },
};

interface DashboardLineChartProps {
  /** If provided, filters to a specific user. If null, shows cumulative (all users). */
  crmUserId?: string | null;
  /** If true, fetches data for the logged-in user */
  isPersonal?: boolean;
}

export function DashboardLineChart({ crmUserId, isPersonal = true }: DashboardLineChartProps) {
  const [category, setCategory] = useState<Category>('growth');
  const [data, setData] = useState<DayPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartError, setChartError] = useState(false);

  const config = CATEGORY_CONFIG[category];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setChartError(false);
    try {
      let userId = crmUserId;
      if (isPersonal && !userId) {
        const { data: currentId } = await getCurrentCrmUserId();
        userId = currentId;
      }

      const now = new Date();
      const sevenDaysAgo = subDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 6);
      const sinceISO = sevenDaysAgo.toISOString();

      // Fetch data based on category
      if (category === 'growth') {
        const contactsQuery = supabase.from('contacts').select('created_at').gte('created_at', sinceISO);
        const companiesQuery = supabase.from('companies').select('created_at').gte('created_at', sinceISO);

        if (userId) {
          contactsQuery.eq('created_by_crm_user_id', userId);
          companiesQuery.eq('created_by_crm_user_id', userId);
        }

        const [{ data: contacts }, { data: companies }] = await Promise.all([contactsQuery, companiesQuery]);

        const days = buildDays(now, 7);
        (contacts || []).forEach(c => {
          if (c.created_at) incrementDay(days, c.created_at, 'contactsAdded');
        });
        (companies || []).forEach(c => {
          if (c.created_at) incrementDay(days, c.created_at, 'companiesAdded');
        });
        setData(days);
      } else if (category === 'engagement') {
        // Need assignments + interactions
        const assignQuery = supabase.from('contact_assignments')
          .select('contact_id, stage')
          .eq('status', 'ACTIVE')
          .eq('assignment_role', 'PRIMARY');

        if (userId) assignQuery.eq('assigned_to_crm_user_id', userId);

        const [{ data: assignments }, { data: interactions }] = await Promise.all([
          assignQuery,
          supabase.from('v_contact_interactions_timeline')
            .select('contact_id, interaction_at')
            .gte('interaction_at', sinceISO),
        ]);

        const stageContacts: Record<string, Set<string>> = {
          COLD_CALLING: new Set(),
          ASPIRATION: new Set(),
          ACHIEVEMENT: new Set(),
        };
        (assignments || []).forEach(a => {
          if (stageContacts[a.stage]) stageContacts[a.stage].add(a.contact_id);
        });

        const assignedIds = new Set((assignments || []).map(a => a.contact_id));
        const filteredInteractions = (interactions || []).filter(i => assignedIds.has(i.contact_id));

        const days = buildDays(now, 7);
        // Track unique contacts per day per stage using separate maps
        const ccSets = new Map<string, Set<string>>();
        const aspSets = new Map<string, Set<string>>();
        const achSets = new Map<string, Set<string>>();

        filteredInteractions.forEach(i => {
          if (!i.interaction_at) return;
          const dayStr = format(new Date(i.interaction_at), 'yyyy-MM-dd');
          const day = days.find(d => d.date === dayStr);
          if (!day) return;

          if (stageContacts.COLD_CALLING.has(i.contact_id)) {
            if (!ccSets.has(dayStr)) ccSets.set(dayStr, new Set());
            ccSets.get(dayStr)!.add(i.contact_id);
            day.coldCalling = ccSets.get(dayStr)!.size;
          }
          if (stageContacts.ASPIRATION.has(i.contact_id)) {
            if (!aspSets.has(dayStr)) aspSets.set(dayStr, new Set());
            aspSets.get(dayStr)!.add(i.contact_id);
            day.aspiration = aspSets.get(dayStr)!.size;
          }
          if (stageContacts.ACHIEVEMENT.has(i.contact_id)) {
            if (!achSets.has(dayStr)) achSets.set(dayStr, new Set());
            achSets.get(dayStr)!.add(i.contact_id);
            day.achievement = achSets.get(dayStr)!.size;
          }
        });

        // Ensure numeric values
        days.forEach(d => {
          d.coldCalling = Number(d.coldCalling) || 0;
          d.aspiration = Number(d.aspiration) || 0;
          d.achievement = Number(d.achievement) || 0;
        });
        setData(days);
      } else {
        // Commercial — all zeros
        setData(buildDays(now, 7));
      }
    } catch (err) {
      console.error('DashboardLineChart error:', err);
      setChartError(true);
    } finally {
      setIsLoading(false);
    }
  }, [category, crmUserId, isPersonal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-4.5 w-4.5 text-primary" />
            </div>
            <CardTitle className="text-base">Performance Trend</CardTitle>
          </div>
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="engagement">Engagement by Stage</SelectItem>
              <SelectItem value="commercial">Commercial / Deal Activity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[260px] w-full rounded-lg" />
        ) : chartError ? (
          <FallbackTable data={data} config={config} />
        ) : (
          <ChartRenderer data={data} config={config} onError={() => setChartError(true)} />
        )}
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Last 7 days · Click counts to open filtered list
        </p>
      </CardContent>
    </Card>
  );
}

function ChartRenderer({
  data,
  config,
  onError,
}: {
  data: DayPoint[];
  config: typeof CATEGORY_CONFIG[Category];
  onError: () => void;
}) {
  try {
    return (
      <div style={{ minHeight: 260 }} className="w-full">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            {config.lines.map(line => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.label}
                stroke={line.color}
                strokeWidth={2}
                dot={{ r: 3, fill: line.color }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  } catch {
    onError();
    return null;
  }
}

function FallbackTable({
  data,
  config,
}: {
  data: DayPoint[];
  config: typeof CATEGORY_CONFIG[Category];
}) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Day</TableHead>
            {config.lines.map(l => (
              <TableHead key={l.key} className="text-xs text-right">{l.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(day => (
            <TableRow key={day.date}>
              <TableCell className="text-sm py-1.5">{day.dateLabel}</TableCell>
              {config.lines.map(l => (
                <TableCell key={l.key} className="text-right text-sm tabular-nums py-1.5">
                  {(day[l.key] as number) || 0}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ── helpers ── */

function buildDays(now: Date, count: number): DayPoint[] {
  const days: DayPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = subDays(now, i);
    days.push({
      date: format(d, 'yyyy-MM-dd'),
      dateLabel: format(d, 'EEE dd'),
      contactsAdded: 0,
      companiesAdded: 0,
      coldCalling: 0,
      aspiration: 0,
      achievement: 0,
      enquiries: 0,
      offered: 0,
      subs: 0,
      covered: 0,
      lost: 0,
    });
  }
  return days;
}

function incrementDay(days: DayPoint[], dateStr: string, key: string) {
  const dayStr = format(new Date(dateStr), 'yyyy-MM-dd');
  const day = days.find(d => d.date === dayStr);
  if (day) {
    day[key] = ((day[key] as number) || 0) + 1;
  }
}
