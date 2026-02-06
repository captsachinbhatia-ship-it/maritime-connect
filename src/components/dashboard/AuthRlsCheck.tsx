import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, ShieldX, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VisibilityRow {
  item: string;
  cnt: number;
}

export function AuthRlsCheck() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [crmUserId, setCrmUserId] = useState<string | null>(null);
  const [counts, setCounts] = useState<VisibilityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const runChecks = async () => {
    setLoading(true);
    const [adminRes, crmRes, countsRes] = await Promise.all([
      supabase.rpc('is_admin'),
      supabase.rpc('current_crm_user_id'),
      supabase.rpc('rls_visibility_counts'),
    ]);

    setIsAdmin(adminRes.error ? null : (adminRes.data as boolean));
    setCrmUserId(crmRes.error ? null : (crmRes.data as string | null));

    if (!countsRes.error && Array.isArray(countsRes.data)) {
      setCounts(countsRes.data as VisibilityRow[]);
    } else {
      // Fallback: run individual count queries
      const [c1, c2, c3] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase.from('contact_phones').select('id', { count: 'exact', head: true }),
        supabase.from('contact_assignments').select('id', { count: 'exact', head: true }),
      ]);
      setCounts([
        { item: 'contacts', cnt: c1.count ?? 0 },
        { item: 'contact_phones', cnt: c2.count ?? 0 },
        { item: 'contact_assignments', cnt: c3.count ?? 0 },
      ]);
    }

    setLoading(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const pass = isAdmin === true && crmUserId !== null;

  return (
    <Card className="border-dashed">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          {pass ? (
            <ShieldCheck className="h-4 w-4 text-green-600" />
          ) : (
            <ShieldX className="h-4 w-4 text-destructive" />
          )}
          <CardTitle className="text-sm font-medium">Auth &amp; RLS Check</CardTitle>
          <Badge
            variant={pass ? 'default' : 'destructive'}
            className={pass ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
          >
            {loading ? '…' : pass ? 'PASS' : 'FAIL'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={runChecks}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground font-mono">
          <span>
            is_admin: <strong className={isAdmin ? 'text-green-600' : 'text-destructive'}>{String(isAdmin)}</strong>
          </span>
          <span>
            crm_user_id: <strong className={crmUserId ? 'text-green-600' : 'text-destructive'}>{crmUserId ?? 'null'}</strong>
          </span>
          {counts.map((r) => (
            <span key={r.item}>
              {r.item}: <strong className="text-foreground">{r.cnt}</strong>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
