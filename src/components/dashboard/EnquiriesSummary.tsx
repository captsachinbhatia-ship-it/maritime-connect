import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, AlertCircle, PlusCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { CargoEnquiryModal } from '@/components/enquiries/CargoEnquiryModal';

interface EnquiriesSummaryProps {
  /** null = company-wide (CEO), string = specific user */
  crmUserId?: string | null;
  /** true = filter to current user's enquiries */
  isPersonal?: boolean;
}

interface KPICounts {
  generatedToday: number;
  generated7d: number;
  closedToday: number;
  closed7d: number;
}

const CLOSED_STATUSES = ['WON', 'LOST', 'CANCELLED'];

export function EnquiriesSummary({ crmUserId, isPersonal = false }: EnquiriesSummaryProps) {
  const navigate = useNavigate();
  const { crmUser } = useAuth();
  const [counts, setCounts] = useState<KPICounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewEnquiry, setShowNewEnquiry] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const effectiveUserId = isPersonal ? crmUser?.id ?? null : crmUserId ?? null;

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      setError(null);

      try {
        // IST today boundaries
        const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const todayStart = new Date(nowIST);
        todayStart.setHours(0, 0, 0, 0);
        // Convert back to UTC for query
        const todayStartUTC = new Date(todayStart.getTime() - (330 * 60 * 1000)); // IST = UTC+5:30
        const sevenDaysAgo = new Date(todayStartUTC.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todayISO = todayStartUTC.toISOString();
        const sevenDaysISO = sevenDaysAgo.toISOString();

        // Build base queries
        const buildQuery = (table: string) => {
          let q = supabase.from(table).select('id, status, created_at, assigned_to, created_by', { count: 'exact' });
          if (effectiveUserId) {
            q = q.or(`assigned_to.eq.${effectiveUserId},created_by.eq.${effectiveUserId}`);
          }
          return q;
        };

        // Fetch all relevant enquiries in one call - we'll bucket client-side
        const q = buildQuery('enquiries');
        const { data, error: fetchError } = await q;

        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        const rows = data || [];
        const todayMs = todayStartUTC.getTime();
        const sevenDaysMs = sevenDaysAgo.getTime();

        let generatedToday = 0;
        let generated7d = 0;
        let closedToday = 0;
        let closed7d = 0;

        for (const row of rows) {
          const createdMs = row.created_at ? new Date(row.created_at).getTime() : 0;
          if (createdMs >= todayMs) generatedToday++;
          if (createdMs >= sevenDaysMs) generated7d++;

          if (CLOSED_STATUSES.includes(row.status)) {
            // Use updated_at as proxy for closed_at if not available
            if (createdMs >= todayMs) closedToday++;
            if (createdMs >= sevenDaysMs) closed7d++;
          }
        }

        setCounts({ generatedToday, generated7d, closedToday, closed7d });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [effectiveUserId, refreshKey]);

  const handleClick = (filter: 'generated_today' | 'generated_7d' | 'closed_today' | 'closed_7d') => {
    navigate(`/enquiries?kpi=${filter}`);
  };

  const kpiItems = [
    { label: 'Generated Today', value: counts?.generatedToday ?? 0, filter: 'generated_today' as const },
    { label: 'Generated (7 Days)', value: counts?.generated7d ?? 0, filter: 'generated_7d' as const },
    { label: 'Closed Today', value: counts?.closedToday ?? 0, filter: 'closed_today' as const },
    { label: 'Closed (7 Days)', value: counts?.closed7d ?? 0, filter: 'closed_7d' as const },
  ];

  const handleEnquiryCreated = () => {
    setShowNewEnquiry(false);
    window.dispatchEvent(new Event('dashboard:refresh'));
    setRefreshKey(k => k + 1);
  };

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4.5 w-4.5 text-primary" />
              </div>
              <CardTitle className="text-base">Enquiries Overview</CardTitle>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowNewEnquiry(true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              New Enquiry
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {kpiItems.map((item) => (
                <div key={item.label} className="rounded-lg border p-2.5">
                  <p className="text-[11px] text-muted-foreground leading-tight">{item.label}</p>
                  {loading ? (
                    <div className="mt-1 h-6 w-10 animate-pulse rounded bg-muted" />
                  ) : (
                    <p
                      className="text-lg font-bold tabular-nums cursor-pointer text-primary hover:underline leading-tight mt-0.5"
                      onClick={() => handleClick(item.filter)}
                    >
                      {item.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CargoEnquiryModal
        open={showNewEnquiry}
        onClose={() => setShowNewEnquiry(false)}
        onCreated={handleEnquiryCreated}
      />
    </>
  );
}
