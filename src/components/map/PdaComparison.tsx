import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PortPda } from '@/types/maritime';

interface PdaComparisonProps {
  ports: PortPda[];
}

const COST_ITEMS = [
  { key: 'port_dues', label: 'Port Dues' },
  { key: 'pilotage', label: 'Pilotage' },
  { key: 'towage', label: 'Towage' },
  { key: 'agency_fees', label: 'Agency Fees' },
  { key: 'mooring', label: 'Mooring' },
  { key: 'misc', label: 'Misc' },
] as const;

const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444'];

export function PdaComparison({ ports }: PdaComparisonProps) {
  // Chart data: one entry per cost item, with each port as a bar
  const chartData = COST_ITEMS.map(item => {
    const entry: Record<string, any> = { name: item.label };
    ports.forEach((p, i) => {
      entry[p.port_name || `Port ${i + 1}`] = (p as any)[item.key] || 0;
    });
    return entry;
  });

  // Total chart data
  const totalData = [{
    name: 'Total PDA',
    ...Object.fromEntries(ports.map(p => [
      p.port_name || 'Port',
      (p.port_dues || 0) + (p.pilotage || 0) + (p.towage || 0) +
      (p.agency_fees || 0) + (p.mooring || 0) + (p.misc || 0),
    ])),
  }];

  // Find cheapest per category
  const cheapest: Record<string, string> = {};
  COST_ITEMS.forEach(item => {
    let min = Infinity;
    let minPort = '';
    ports.forEach(p => {
      const val = (p as any)[item.key] || 0;
      if (val < min) { min = val; minPort = p.port_name || ''; }
    });
    cheapest[item.key] = minPort;
  });

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold">Port PDA Comparison</h3>

      {/* Side-by-side table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1 pr-4 text-muted-foreground">Cost Item</th>
              {ports.map(p => (
                <th key={p.id} className="text-right py-1 px-2 font-medium">{p.port_name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COST_ITEMS.map(item => (
              <tr key={item.key} className="border-b border-dashed">
                <td className="py-1 pr-4 text-muted-foreground">{item.label}</td>
                {ports.map(p => {
                  const val = (p as any)[item.key] || 0;
                  const isCheapest = cheapest[item.key] === p.port_name;
                  return (
                    <td key={p.id} className={`text-right py-1 px-2 ${isCheapest ? 'text-green-600 font-semibold' : ''}`}>
                      ${val.toLocaleString()}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-1 pr-4">Total</td>
              {ports.map(p => {
                const total = (p.port_dues || 0) + (p.pilotage || 0) + (p.towage || 0) +
                  (p.agency_fees || 0) + (p.mooring || 0) + (p.misc || 0);
                return <td key={p.id} className="text-right py-1 px-2">${total.toLocaleString()}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Total PDA bar chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={totalData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a52" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {ports.map((p, i) => (
            <Bar key={p.id} dataKey={p.port_name || `Port ${i + 1}`} fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
