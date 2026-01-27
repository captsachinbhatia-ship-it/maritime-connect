import { useEffect, useState } from 'react';
import { getCompaniesPreview } from '@/services/companies';
import type { Company } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { CheckCircle, XCircle, Loader2, Database, Building2 } from 'lucide-react';

type ConnectionStatus = 'loading' | 'connected' | 'error';

export default function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setStatus('loading');
      const { data, error } = await getCompaniesPreview();

      if (error) {
        setStatus('error');
        setError(error);
      } else {
        setStatus('connected');
        setCompanies(data || []);
      }
    }

    fetchData();
  }, []);

  const getStatusBadge = () => {
    switch (status) {
      case 'loading':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting...
          </Badge>
        );
      case 'connected':
        return (
          <Badge className="gap-1 bg-success text-success-foreground hover:bg-success/90">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Error
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome to AQ Maritime CRM
        </p>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Database Connection</CardTitle>
              <CardDescription>Supabase health check</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </CardHeader>
        <CardContent>
          {status === 'error' && (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">Connection Failed</p>
              <p className="mt-1 opacity-80">{error}</p>
              <p className="mt-2 text-xs">
                This may be due to Row Level Security (RLS) policies or network issues.
              </p>
            </div>
          )}
          {status === 'connected' && (
            <p className="text-sm text-muted-foreground">
              Successfully connected to the database. Retrieved {companies.length} company records.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Companies Preview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Building2 className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Companies Preview</CardTitle>
              <CardDescription>Latest 5 companies from the database</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {status === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === 'error' && (
            <div className="py-8 text-center text-muted-foreground">
              Unable to load companies data
            </div>
          )}

          {status === 'connected' && companies.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No companies found in the database
            </div>
          )}

          {status === 'connected' && companies.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Company Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {company.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {company.company_name || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
