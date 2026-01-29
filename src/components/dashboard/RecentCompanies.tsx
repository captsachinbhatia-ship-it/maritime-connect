import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Building2 } from 'lucide-react';
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Building2 className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Recently Added Companies</CardTitle>
            <CardDescription>Latest companies in the database</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : companies.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No companies found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">
                    {company.company_name || '—'}
                  </TableCell>
                  <TableCell>
                    {company.company_type ? (
                      <Badge variant="secondary">{company.company_type}</Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {company.country || '—'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {company.updated_at
                      ? formatDistanceToNow(new Date(company.updated_at), { addSuffix: true })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
