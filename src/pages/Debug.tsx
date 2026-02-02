import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TableData {
  name: string;
  data: Record<string, unknown>[] | null;
  error: string | null;
  isLoading: boolean;
  count: number;
}

export default function Debug() {
  const [tables, setTables] = useState<TableData[]>([
    { name: 'companies', data: null, error: null, isLoading: true, count: 0 },
    { name: 'contacts', data: null, error: null, isLoading: true, count: 0 },
    { name: 'interactions', data: null, error: null, isLoading: true, count: 0 },
  ]);

  const fetchTableData = async (tableName: string): Promise<Partial<TableData>> => {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(50);

      if (error) {
        return { data: null, error: error.message, isLoading: false, count: 0 };
      }

      return { data: data as Record<string, unknown>[], error: null, isLoading: false, count: count ?? 0 };
    } catch (err) {
      return { 
        data: null, 
        error: err instanceof Error ? err.message : 'Unknown error', 
        isLoading: false,
        count: 0 
      };
    }
  };

  const loadAllTables = async () => {
    setTables(prev => prev.map(t => ({ ...t, isLoading: true })));

    const results = await Promise.all(
      tables.map(async (table) => {
        const result = await fetchTableData(table.name);
        return { ...table, ...result };
      })
    );

    setTables(results);
  };

  useEffect(() => {
    loadAllTables();
  }, []);

  const getColumns = (data: Record<string, unknown>[] | null): string[] => {
    if (!data || data.length === 0) return [];
    // Get first 5 columns for display
    return Object.keys(data[0]).slice(0, 5);
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 50);
    const str = String(value);
    return str.length > 50 ? str.slice(0, 50) + '...' : str;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Database className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Debug – Raw Supabase</h1>
            <p className="text-muted-foreground">Direct table queries (limit 50 rows)</p>
          </div>
        </div>
        <Button onClick={loadAllTables} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh All
        </Button>
      </div>

      {tables.map((table) => (
        <Card key={table.name}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-mono">{table.name}</CardTitle>
                <CardDescription>
                  {table.isLoading ? 'Loading...' : `${table.count} total rows`}
                </CardDescription>
              </div>
              {!table.isLoading && !table.error && (
                <Badge variant="secondary">
                  Showing {table.data?.length ?? 0} of {table.count}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {table.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : table.error ? (
              <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
                <strong>Error:</strong> {table.error}
              </div>
            ) : !table.data || table.data.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No rows found in {table.name}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {getColumns(table.data).map((col) => (
                        <TableHead key={col} className="font-mono text-xs">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.data.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        {getColumns(table.data).map((col) => (
                          <TableCell key={col} className="font-mono text-xs">
                            {formatValue(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {table.data.length > 10 && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Showing first 10 rows of {table.data.length} fetched
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
