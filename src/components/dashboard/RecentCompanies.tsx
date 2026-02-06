import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';

interface RecentCompany {
  id: string;
  company_name: string | null;
  company_type: string | null;
  country: string | null;
  updated_at: string | null;
}

export function RecentCompanies() {
  const [companies, setCompanies] = useState<RecentCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentCompanies = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('companies')
          .select('id, company_name, company_type, country, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5);
        setCompanies(data || []);
      } catch (error) {
        console.error('Failed to fetch recent companies:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecentCompanies();
  }, []);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <Building2 className="h-4.5 w-4.5 text-accent-foreground" />
          </div>
          <CardTitle className="text-base">Recent Companies</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No companies found</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="py-2">
                      <div>
                        <p className="text-sm font-medium leading-tight">{company.company_name || '—'}</p>
                        {company.country && (
                          <p className="text-[11px] text-muted-foreground leading-tight">{company.country}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {company.company_type ? (
                        <Badge variant="secondary" className="text-[11px]">{company.company_type}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground py-2">
                      {company.updated_at
                        ? formatDistanceToNow(new Date(company.updated_at), { addSuffix: true })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
