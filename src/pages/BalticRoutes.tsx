import { useEffect, useState, useMemo } from 'react';
import { Anchor, CalendarDays, RefreshCw, ChevronRight, ChevronDown, Check, Download, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface DirtyRoute {
  id: string;
  report_date: string;
  route: string;
  description: string | null;
  size_mt: string | null;
  worldscale: number | null;
  ws_change: number | null;
  tc_earnings_usd: number | null;
  tc_change: number | null;
  source_broker: string | null;
  created_at: string;
  resolved_id: string | null;
}

interface ResolvedRoute {
  id: string;
  report_date: string;
  route: string;
  description: string | null;
  size_mt: string | null;
  worldscale: number | null;
  ws_change: number | null;
  tc_earnings_usd: number | null;
  tc_change: number | null;
  source_broker: string | null;
  created_at: string;
}

interface RouteGroup {
  routeCode: string;
  resolved: ResolvedRoute | null;
  dirtyRows: DirtyRoute[];
}

// Editable fields for the resolve dialog
interface ResolveForm {
  description: string;
  size_mt: string;
  worldscale: string;
  ws_change: string;
  tc_earnings_usd: string;
  tc_change: string;
}

export default function BalticRoutes() {
  const [dirtyRows, setDirtyRows] = useState<DirtyRoute[]>([]);
  const [resolvedRows, setResolvedRows] = useState<ResolvedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportDate, setReportDate] = useState<string | null>(null);
  const [importedAt, setImportedAt] = useState<string | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [resolveTarget, setResolveTarget] = useState<RouteGroup | null>(null);
  const [resolveForm, setResolveForm] = useState<ResolveForm>({ description: '', size_mt: '', worldscale: '', ws_change: '', tc_earnings_usd: '', tc_change: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch dirty rows
      const { data: dirty, error: dirtyErr } = await supabase
        .from('dirty_baltic_routes')
        .select('*')
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (dirtyErr) {
        console.error('Error fetching dirty routes:', dirtyErr);
        return;
      }

      if (!dirty || dirty.length === 0) {
        setDirtyRows([]);
        setResolvedRows([]);
        setReportDate(null);
        setImportedAt(null);
        return;
      }

      const latestDate = dirty[0].report_date;
      setReportDate(latestDate);

      const latestDirty = dirty.filter((r) => r.report_date === latestDate);
      setDirtyRows(latestDirty);

      // Determine import timestamp
      if (latestDirty.length > 0) {
        const maxCreatedAt = latestDirty.reduce((max, r) =>
          r.created_at > max ? r.created_at : max, latestDirty[0].created_at
        );
        setImportedAt(maxCreatedAt);
      }

      // Fetch resolved rows for this date
      const { data: resolved, error: resolvedErr } = await supabase
        .from('baltic_routes')
        .select('*')
        .eq('report_date', latestDate);

      if (resolvedErr) {
        console.error('Error fetching resolved routes:', resolvedErr);
      }
      setResolvedRows(resolved || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Build grouped route data
  const routeGroups: RouteGroup[] = useMemo(() => {
    const groupMap = new Map<string, RouteGroup>();

    // Seed groups from dirty rows
    for (const row of dirtyRows) {
      if (!groupMap.has(row.route)) {
        groupMap.set(row.route, { routeCode: row.route, resolved: null, dirtyRows: [] });
      }
      groupMap.get(row.route)!.dirtyRows.push(row);
    }

    // Attach resolved entries
    for (const row of resolvedRows) {
      if (!groupMap.has(row.route)) {
        groupMap.set(row.route, { routeCode: row.route, resolved: null, dirtyRows: [] });
      }
      groupMap.get(row.route)!.resolved = row;
    }

    // Sort naturally (TD2, TD3C, TD6, ... TD25)
    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => {
      const aPrefix = a.routeCode.replace(/[0-9]+.*/, '');
      const bPrefix = b.routeCode.replace(/[0-9]+.*/, '');
      if (aPrefix !== bPrefix) return aPrefix.localeCompare(bPrefix);
      const aNum = parseInt(a.routeCode.replace(/[^0-9]/g, '') || '0', 10);
      const bNum = parseInt(b.routeCode.replace(/[^0-9]/g, '') || '0', 10);
      if (aNum !== bNum) return aNum - bNum;
      return a.routeCode.localeCompare(b.routeCode);
    });

    return groups;
  }, [dirtyRows, resolvedRows]);

  const resolvedCount = routeGroups.filter((g) => g.resolved).length;
  const unresolvedCount = routeGroups.filter((g) => !g.resolved).length;

  const toggleExpand = (routeCode: string) => {
    setExpandedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(routeCode)) next.delete(routeCode);
      else next.add(routeCode);
      return next;
    });
  };

  const openResolveDialog = (group: RouteGroup) => {
    // Pre-fill from existing resolved data, or from the latest dirty row
    const source = group.resolved || group.dirtyRows[0];
    setResolveForm({
      description: source?.description || '',
      size_mt: source?.size_mt || '',
      worldscale: source?.worldscale?.toString() || '',
      ws_change: source?.ws_change?.toString() || '',
      tc_earnings_usd: source?.tc_earnings_usd?.toString() || '',
      tc_change: source?.tc_change?.toString() || '',
    });
    setResolveTarget(group);
  };

  const handleResolve = async () => {
    if (!resolveTarget || !reportDate) return;
    setSaving(true);
    try {
      const payload = {
        report_date: reportDate,
        route: resolveTarget.routeCode,
        description: resolveForm.description || null,
        size_mt: resolveForm.size_mt || null,
        worldscale: resolveForm.worldscale ? parseFloat(resolveForm.worldscale) : null,
        ws_change: resolveForm.ws_change ? parseFloat(resolveForm.ws_change) : null,
        tc_earnings_usd: resolveForm.tc_earnings_usd ? parseFloat(resolveForm.tc_earnings_usd) : null,
        tc_change: resolveForm.tc_change ? parseFloat(resolveForm.tc_change) : null,
        source_broker: 'resolved',
      };

      let resolvedId: string;

      if (resolveTarget.resolved) {
        // Update existing resolved row
        const { error } = await supabase
          .from('baltic_routes')
          .update(payload)
          .eq('id', resolveTarget.resolved.id);
        if (error) throw error;
        resolvedId = resolveTarget.resolved.id;
      } else {
        // Insert new resolved row
        const { data, error } = await supabase
          .from('baltic_routes')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        resolvedId = data.id;
      }

      // Link all dirty rows for this route+date to the resolved entry
      const dirtyIds = resolveTarget.dirtyRows.map((r) => r.id);
      if (dirtyIds.length > 0) {
        const { error: linkErr } = await supabase
          .from('dirty_baltic_routes')
          .update({ resolved_id: resolvedId })
          .in('id', dirtyIds);
        if (linkErr) throw linkErr;
      }

      toast({ title: 'Resolved', description: `Route ${resolveTarget.routeCode} has been resolved.` });
      setResolveTarget(null);
      await fetchData();
    } catch (err: any) {
      console.error('Resolve error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to resolve route.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadCSV = () => {
    // Resolved routes use resolved data; unresolved routes appear as separate broker rows
    const rows: Record<string, string>[] = [];
    for (const group of routeGroups) {
      if (group.resolved) {
        rows.push({
          Route: group.routeCode,
          Description: group.resolved.description || '',
          'Size (MT)': group.resolved.size_mt || '',
          Worldscale: group.resolved.worldscale?.toString() || '',
          'WS Change': group.resolved.ws_change?.toString() || '',
          'TC Earnings (USD/day)': group.resolved.tc_earnings_usd?.toString() || '',
          'TC Change': group.resolved.tc_change?.toString() || '',
          Source: 'Resolved',
          Status: 'RESOLVED',
        });
      } else {
        for (const d of group.dirtyRows) {
          rows.push({
            Route: d.route,
            Description: d.description || '',
            'Size (MT)': d.size_mt || '',
            Worldscale: d.worldscale?.toString() || '',
            'WS Change': d.ws_change?.toString() || '',
            'TC Earnings (USD/day)': d.tc_earnings_usd?.toString() || '',
            'TC Change': d.tc_change?.toString() || '',
            Source: d.source_broker?.replace(/_/g, ' ') || '',
            Status: 'UNRESOLVED',
          });
        }
      }
    }

    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => `"${(r[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `baltic-routes-${reportDate || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const fmtNum = (val: number | null) => (val == null ? '—' : val.toLocaleString('en-US'));
  const fmtUsd = (val: number | null) => (val == null ? '—' : `$${val.toLocaleString('en-US')}`);

  const changeClass = (val: number | null) =>
    val == null ? '' : val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : '';

  const changePrefix = (val: number | null) => (val != null && val > 0 ? '+' : '');

  const today = new Date().toISOString().split('T')[0];
  const isToday = reportDate === today;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Baltic Routes & Rate Assessments</h1>
          <p className="mt-1 text-muted-foreground">
            Dirty tanker route assessments from broker reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadCSV} disabled={loading || routeGroups.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Anchor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {reportDate ? `Report Date: ${formatDate(reportDate)}` : 'No Data Available'}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {importedAt ? `Imported on ${formatDateTime(importedAt)}` : 'No imports found'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {reportDate && (
                <Badge variant={isToday ? 'default' : 'secondary'}>
                  {isToday ? "Today's Data" : `${Math.round((Date.now() - new Date(reportDate).getTime()) / 86400000)} days ago`}
                </Badge>
              )}
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {resolvedCount} resolved
              </Badge>
              {unresolvedCount > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  {unresolvedCount} unresolved
                </Badge>
              )}
              <Badge variant="outline">{routeGroups.length} routes</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Routes Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Loading routes...</span>
          </CardContent>
        </Card>
      ) : routeGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Anchor className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">No Baltic route data available</p>
            <p className="text-sm text-muted-foreground mt-1">Data will appear here once imported from broker reports</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[80px]">Route</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Size (MT)</TableHead>
                  <TableHead className="text-right">Worldscale</TableHead>
                  <TableHead className="text-right">WS Change</TableHead>
                  <TableHead className="text-right">TC Earnings (USD/day)</TableHead>
                  <TableHead className="text-right">TC Change</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routeGroups.map((group) => {
                  const isExpanded = expandedRoutes.has(group.routeCode);
                  const isResolved = !!group.resolved;
                  const hasManyBrokers = group.dirtyRows.length > 1;
                  const displayRow = isResolved ? group.resolved! : group.dirtyRows[0];

                  if (!isResolved && hasManyBrokers) {
                    // UNRESOLVED with multiple brokers: show each as separate row
                    return group.dirtyRows.map((d, idx) => (
                      <TableRow key={d.id} className="bg-amber-50/40">
                        <TableCell>
                          {idx === 0 && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openResolveDialog(group)}>
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-semibold">{d.route}</TableCell>
                        <TableCell>{d.description || '—'}</TableCell>
                        <TableCell className="text-right">{d.size_mt || '—'}</TableCell>
                        <TableCell className="text-right font-mono">{fmtNum(d.worldscale)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={changeClass(d.ws_change)}>
                            {d.ws_change != null ? `${changePrefix(d.ws_change)}${fmtNum(d.ws_change)}` : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmtUsd(d.tc_earnings_usd)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={changeClass(d.tc_change)}>
                            {d.tc_change != null ? `${changePrefix(d.tc_change)}${fmtUsd(d.tc_change)}` : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {d.source_broker?.replace(/_/g, ' ') || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {idx === 0 && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openResolveDialog(group)}>
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ));
                  }

                  // Single broker unresolved OR resolved — show one main row
                  return (
                    <>
                      <TableRow
                        key={displayRow.id}
                        className={isResolved ? 'bg-green-50/30' : ''}
                      >
                        <TableCell>
                          {isResolved && group.dirtyRows.length > 0 && (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleExpand(group.routeCode)}>
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-semibold">{group.routeCode}</TableCell>
                        <TableCell>{displayRow.description || '—'}</TableCell>
                        <TableCell className="text-right">{displayRow.size_mt || '—'}</TableCell>
                        <TableCell className="text-right font-mono">{fmtNum(displayRow.worldscale)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={changeClass(displayRow.ws_change)}>
                            {displayRow.ws_change != null ? `${changePrefix(displayRow.ws_change)}${fmtNum(displayRow.ws_change)}` : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmtUsd(displayRow.tc_earnings_usd)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={changeClass(displayRow.tc_change)}>
                            {displayRow.tc_change != null ? `${changePrefix(displayRow.tc_change)}${fmtUsd(displayRow.tc_change)}` : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {isResolved ? 'resolved' : (displayRow as DirtyRoute).source_broker?.replace(/_/g, ' ') || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isResolved ? (
                            <div className="flex items-center gap-1">
                              <Check className="h-4 w-4 text-green-600" />
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => openResolveDialog(group)}>
                                Edit
                              </Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openResolveDialog(group)}>
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Collapsible broker rows under resolved */}
                      {isResolved && isExpanded && group.dirtyRows.map((d) => (
                        <TableRow key={d.id} className="bg-muted/30">
                          <TableCell></TableCell>
                          <TableCell className="font-mono text-muted-foreground text-sm pl-6">{d.route}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{d.description || '—'}</TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">{d.size_mt || '—'}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground text-sm">{fmtNum(d.worldscale)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground text-sm">
                            {d.ws_change != null ? `${changePrefix(d.ws_change)}${fmtNum(d.ws_change)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground text-sm">{fmtUsd(d.tc_earnings_usd)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground text-sm">
                            {d.tc_change != null ? `${changePrefix(d.tc_change)}${fmtUsd(d.tc_change)}` : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {d.source_broker?.replace(/_/g, ' ') || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      ))}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Resolve Dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={(open) => { if (!open) setResolveTarget(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolve Route {resolveTarget?.routeCode}</DialogTitle>
          </DialogHeader>
          {resolveTarget && (
            <div className="space-y-4">
              {/* Show broker values for reference */}
              {resolveTarget.dirtyRows.length > 0 && (
                <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Broker Reports</p>
                  {resolveTarget.dirtyRows.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{d.source_broker?.replace(/_/g, ' ')}</span>
                      <span className="font-mono">
                        WS {fmtNum(d.worldscale)} | TC {fmtUsd(d.tc_earnings_usd)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input value={resolveForm.description} onChange={(e) => setResolveForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Size (MT)</label>
                  <Input value={resolveForm.size_mt} onChange={(e) => setResolveForm((f) => ({ ...f, size_mt: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Worldscale</label>
                  <Input type="number" value={resolveForm.worldscale} onChange={(e) => setResolveForm((f) => ({ ...f, worldscale: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">WS Change</label>
                  <Input type="number" value={resolveForm.ws_change} onChange={(e) => setResolveForm((f) => ({ ...f, ws_change: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">TC Earnings (USD/day)</label>
                  <Input type="number" value={resolveForm.tc_earnings_usd} onChange={(e) => setResolveForm((f) => ({ ...f, tc_earnings_usd: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">TC Change</label>
                  <Input type="number" value={resolveForm.tc_change} onChange={(e) => setResolveForm((f) => ({ ...f, tc_change: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
            <Button onClick={handleResolve} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              {resolveTarget?.resolved ? 'Update Resolved' : 'Resolve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
