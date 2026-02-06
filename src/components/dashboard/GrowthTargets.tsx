import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { format, subDays } from 'date-fns';
import { WeeklyProgressChart } from './WeeklyProgressChart';

const COMPANY_TARGET = 5;
const CONTACT_TARGET = 10;

export interface WeeklyDayData {
  dateLabel: string;
  touchTarget: number;
  touchDone: number;
  contactsTarget: number;
  contactsAdded: number;
  companiesTarget: number;
  companiesAdded: number;
}

export function GrowthTargets() {
  const navigate = useNavigate();
  const [companiesFound, setCompaniesFound] = useState(0);
  const [contactsAdded, setContactsAdded] = useState(0);
  const [weeklyData, setWeeklyData] = useState<WeeklyDayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
      if (crmError || !currentCrmUserId) {
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Today's companies
      const { count: compCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('created_by_crm_user_id', currentCrmUserId)
        .gte('created_at', startOfToday.toISOString());

      setCompaniesFound(compCount ?? 0);

      // Today's contacts
      const { count: contCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('created_by_crm_user_id', currentCrmUserId)
        .gte('created_at', startOfToday.toISOString());

      setContactsAdded(contCount ?? 0);

      // Weekly data (last 7 days including today)
      const sevenDaysAgo = subDays(startOfToday, 6);

      const [{ data: weekContacts }, { data: weekCompanies }] = await Promise.all([
        supabase
          .from('contacts')
          .select('created_at')
          .eq('created_by_crm_user_id', currentCrmUserId)
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('companies')
          .select('created_at')
          .eq('created_by_crm_user_id', currentCrmUserId)
          .gte('created_at', sevenDaysAgo.toISOString()),
      ]);

      const days: WeeklyDayData[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(now, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const label = format(day, 'EEE dd');

        const contactCount = (weekContacts ?? []).filter(c =>
          c.created_at && format(new Date(c.created_at), 'yyyy-MM-dd') === dayStr
        ).length;

        const companyCount = (weekCompanies ?? []).filter(c =>
          c.created_at && format(new Date(c.created_at), 'yyyy-MM-dd') === dayStr
        ).length;

        days.push({
          dateLabel: label,
          touchTarget: 0,
          touchDone: 0,
          contactsTarget: CONTACT_TARGET,
          contactsAdded: contactCount,
          companiesTarget: COMPANY_TARGET,
          companiesAdded: companyCount,
        });
      }

      setWeeklyData(days);
    } catch (err) {
      console.error('GrowthTargets error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const companyPending = Math.max(0, COMPANY_TARGET - companiesFound);
  const contactPending = Math.max(0, CONTACT_TARGET - contactsAdded);
  const companyPct = Math.min(100, (companiesFound / COMPANY_TARGET) * 100);
  const contactPct = Math.min(100, (contactsAdded / CONTACT_TARGET) * 100);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <CardTitle className="text-base">Growth Targets</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-2 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-2 w-full" />
            </div>
            <Skeleton className="h-[260px] w-full rounded-lg" />
          </div>
        ) : (
          <>
            {/* Today's Progress */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    Companies Found
                  </span>
                  <span className="font-medium tabular-nums">
                    <span
                      className="cursor-pointer text-primary hover:underline"
                      onClick={() => navigate('/companies')}
                    >
                      {companiesFound}
                    </span>
                    <span className="text-muted-foreground">/{COMPANY_TARGET}</span>
                    {companyPending > 0 && (
                      <span className="text-muted-foreground ml-1 text-xs">({companyPending} left)</span>
                    )}
                  </span>
                </div>
                <Progress value={companyPct} className="h-1.5" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    Contacts Added
                  </span>
                  <span className="font-medium tabular-nums">
                    <span
                      className="cursor-pointer text-primary hover:underline"
                      onClick={() => navigate('/contacts?tab=my-added')}
                    >
                      {contactsAdded}
                    </span>
                    <span className="text-muted-foreground">/{CONTACT_TARGET}</span>
                    {contactPending > 0 && (
                      <span className="text-muted-foreground ml-1 text-xs">({contactPending} left)</span>
                    )}
                  </span>
                </div>
                <Progress value={contactPct} className="h-1.5" />
              </div>
            </div>

            {/* Weekly Progress */}
            <WeeklyProgressChart data={weeklyData} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
