import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BarChart3, TableIcon } from 'lucide-react';
import type { WeeklyDayData } from './GrowthTargets';

interface WeeklyProgressChartProps {
  data: WeeklyDayData[];
}

type Metric = 'contacts' | 'companies';

const METRIC_CONFIG: Record<Metric, {
  label: string;
  achievedKey: keyof WeeklyDayData;
  targetKey: keyof WeeklyDayData;
  color: string;
  targetColor: string;
}> = {
  contacts: {
    label: 'Contacts Added',
    achievedKey: 'contactsAdded',
    targetKey: 'contactsTarget',
    color: 'hsl(215, 80%, 25%)',
    targetColor: 'hsl(215, 20%, 45%)',
  },
  companies: {
    label: 'Companies Found',
    achievedKey: 'companiesAdded',
    targetKey: 'companiesTarget',
    color: 'hsl(152, 69%, 35%)',
    targetColor: 'hsl(152, 30%, 55%)',
  },
};

export function WeeklyProgressChart({ data }: WeeklyProgressChartProps) {
  const [metric, setMetric] = useState<Metric>('contacts');
  const [chartError, setChartError] = useState(false);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const config = METRIC_CONFIG[metric];
  const targetValue = data.length > 0 ? (data[0][config.targetKey] as number) : 0;

  const showChart = viewMode === 'chart' && !chartError;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">Last 7 Days</p>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={metric}
            onValueChange={(v) => v && setMetric(v as Metric)}
            size="sm"
            className="h-7"
          >
            <ToggleGroupItem value="contacts" className="text-xs px-2 h-7">
              Contacts
            </ToggleGroupItem>
            <ToggleGroupItem value="companies" className="text-xs px-2 h-7">
              Companies
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as 'chart' | 'table')}
            size="sm"
            className="h-7"
          >
            <ToggleGroupItem value="chart" className="px-1.5 h-7" aria-label="Chart view">
              <BarChart3 className="h-3.5 w-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" className="px-1.5 h-7" aria-label="Table view">
              <TableIcon className="h-3.5 w-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {showChart ? (
        <div style={{ minHeight: 220 }} className="w-full">
          <ChartView
            data={data}
            config={config}
            targetValue={targetValue}
            onError={() => setChartError(true)}
          />
        </div>
      ) : (
        <TableView data={data} />
      )}

      <p className="text-[11px] text-muted-foreground text-center">
        Click counts to open filtered list
      </p>
    </div>
  );
}

function ChartView({
  data,
  config,
  targetValue,
  onError,
}: {
  data: WeeklyDayData[];
  config: typeof METRIC_CONFIG[Metric];
  targetValue: number;
  onError: () => void;
}) {
  try {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214, 25%, 88%)" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: 'hsl(215, 20%, 45%)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'hsl(215, 20%, 45%)' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(0, 0%, 100%)',
              border: '1px solid hsl(214, 25%, 88%)',
              borderRadius: 8,
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            formatter={(value: number) => [value, config.label]}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          />
          {targetValue > 0 && (
            <ReferenceLine
              y={targetValue}
              stroke={config.targetColor}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Target: ${targetValue}`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: config.targetColor,
              }}
            />
          )}
          <Bar
            dataKey={config.achievedKey as string}
            fill={config.color}
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
            name={config.label}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  } catch {
    onError();
    return null;
  }
}

function TableView({ data }: { data: WeeklyDayData[] }) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Day</TableHead>
            <TableHead className="text-xs text-right">Contacts</TableHead>
            <TableHead className="text-xs text-right">Companies</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((day) => (
            <TableRow key={day.dateLabel}>
              <TableCell className="text-sm py-1.5">{day.dateLabel}</TableCell>
              <TableCell className="text-right py-1.5">
                <Badge
                  variant={day.contactsAdded >= day.contactsTarget ? 'default' : 'outline'}
                  className="text-xs tabular-nums"
                >
                  {day.contactsAdded}
                </Badge>
              </TableCell>
              <TableCell className="text-right py-1.5">
                <Badge
                  variant={day.companiesAdded >= day.companiesTarget ? 'default' : 'outline'}
                  className="text-xs tabular-nums"
                >
                  {day.companiesAdded}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
