import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, Building2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { format, subDays } from 'date-fns';

const COMPANY_TARGET = 5;
const CONTACT_TARGET = 10;

interface DayData {
  date: string;
  label: string;
  contacts: number;
  companies: number;
}

export function GrowthTargets() {
  const navigate = useNavigate();
  const [companiesFound, setCompaniesFound] = useState(0);
  const [contactsAdded, setContactsAdded] = useState(0);
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);
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

      setCompaniesFound(compCount || 0);

      // Today's contacts
      const { count: contCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('created_by_crm_user_id', currentCrmUserId)
        .gte('created_at', startOfToday.toISOString());

      setContactsAdded(contCount || 0);

      // Weekly data (last 7 days)
      const days: DayData[] = [];
      const sevenDaysAgo = subDays(startOfToday, 7);

      const { data: weekContacts } = await supabase
        .from('contacts')
        .select('created_at')
        .eq('created_by_crm_user_id', currentCrmUserId)
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: weekCompanies } = await supabase
        .from('companies')
        .select('created_at')
        .eq('created_by_crm_user_id', currentCrmUserId)
        .gte('created_at', sevenDaysAgo.toISOString());

      for (let i = 6; i >= 0; i--) {
        const day = subDays(now, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const label = format(day, 'EEE dd');

        const contactCount = (weekContacts || []).filter(c => {
          return c.created_at && format(new Date(c.created_at), 'yyyy-MM-dd') === dayStr;
        }).length;

        const companyCount = (weekCompanies || []).filter(c => {
          return c.created_at && format(new Date(c.created_at), 'yyyy-MM-dd') === dayStr;
        }).length;

        days.push({ date: dayStr, label, contacts: contactCount, companies: companyCount });
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <CardTitle className="text-lg">Growth Targets</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Today's Progress */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Companies Found
                  </span>
                  <span className="font-medium">
                    <span
                      className="cursor-pointer text-primary hover:underline"
                      onClick={() => navigate('/companies')}
                    >
                      {companiesFound}
                    </span>
                    /{COMPANY_TARGET}
                    {companyPending > 0 && (
                      <span className="text-muted-foreground ml-1">({companyPending} left)</span>
                    )}
                  </span>
                </div>
                <Progress value={companyPct} className="h-2" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    Contacts Added
                  </span>
                  <span className="font-medium">
                    <span
                      className="cursor-pointer text-primary hover:underline"
                      onClick={() => navigate('/contacts?tab=my-added')}
                    >
                      {contactsAdded}
                    </span>
                    /{CONTACT_TARGET}
                    {contactPending > 0 && (
                      <span className="text-muted-foreground ml-1">({contactPending} left)</span>
                    )}
                  </span>
                </div>
                <Progress value={contactPct} className="h-2" />
              </div>
            </div>

            {/* Weekly Table */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Last 7 Days</p>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead className="text-center">Contacts</TableHead>
                      <TableHead className="text-center">Companies</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyData.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="text-sm">{day.label}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={day.contacts >= CONTACT_TARGET ? 'default' : 'outline'} className="text-xs">
                            {day.contacts}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={day.companies >= COMPANY_TARGET ? 'default' : 'outline'} className="text-xs">
                            {day.companies}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
