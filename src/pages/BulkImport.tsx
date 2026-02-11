import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  FileUp,
  Trash2,
  Database,
  ShieldCheck,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ListChecks,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

import { KPICard } from '@/components/dashboard/KPICard';
import { CsvPreviewTable } from '@/components/bulk-import/CsvPreviewTable';
import { StagingTable } from '@/components/bulk-import/StagingTable';
import { ImportConfirmDialog } from '@/components/bulk-import/ImportConfirmDialog';
import { parseCsvContent, generateCsvTemplate } from '@/lib/csvParser';
import {
  insertStagingRows,
  fetchStagingRows,
  validateImportBatch,
  importValidatedContacts,
} from '@/services/bulkImport';
import type { ParsedCsvRow, StagingRow } from '@/services/bulkImport';
import { supabase } from '@/lib/supabaseClient';

export default function BulkImport() {
  const { isAdmin, crmUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const crmUserId = crmUser?.id ?? null;

  // State — single batchId per import attempt
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [stagingRows, setStagingRows] = useState<StagingRow[]>([]);
  const [stagingLoading, setStagingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [inserting, setInserting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  // Derived counts from staging rows (source of truth)
  const pendingRows = stagingRows.filter((r) => r.status === 'PENDING' || r.status === 'NEW');
  const validatedRows = stagingRows.filter((r) => r.status === 'VALIDATED');
  const failedRows = stagingRows.filter((r) => r.status === 'FAILED');
  const duplicateRows = stagingRows.filter((r) => r.status === 'DUPLICATE');
  const importedRows = stagingRows.filter((r) => r.status === 'IMPORTED');
  const hasBeenValidated = stagingRows.length > 0 && pendingRows.length === 0;

  // Two-layer session verification
  const verifySession = async (opName: string): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Session expired', description: 'Please log in again.', variant: 'destructive' });
      return false;
    }
    const sessionEmail = session.user.email;
    const uiEmail = crmUser?.email;
    console.log(`[BulkImport:${opName}] auth.uid=${session.user.id}, session_email=${sessionEmail}, ui_email=${uiEmail}, ui_crmUserId=${crmUserId}`);

    if (uiEmail && sessionEmail && sessionEmail.toLowerCase() !== uiEmail.toLowerCase()) {
      toast({ title: 'User mismatch', description: `Session belongs to ${sessionEmail} but UI shows ${uiEmail}.`, variant: 'destructive' });
      return false;
    }

    const { data: dbCrmId, error: rpcErr } = await supabase.rpc('current_crm_user_id');
    console.log(`[BulkImport:${opName}] DB current_crm_user_id()=${dbCrmId}, expected=${crmUserId}`);
    if (rpcErr) {
      toast({ title: 'Auth verification failed', description: rpcErr.message, variant: 'destructive' });
      return false;
    }
    if (dbCrmId !== crmUserId) {
      toast({ title: 'Identity mismatch', description: `DB sees user ${dbCrmId} but UI user is ${crmUserId}.`, variant: 'destructive' });
      return false;
    }
    return true;
  };

  // Load staging rows
  const loadStagingRows = useCallback(async () => {
    if (!activeBatchId) return;
    setStagingLoading(true);
    const { data } = await fetchStagingRows(activeBatchId);
    setStagingRows(data);
    setStagingLoading(false);
  }, [activeBatchId]);

  // Hidden file input trigger
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // File select handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const { rows, error } = parseCsvContent(content);
      if (error) {
        setParseError(error);
        setParsedRows([]);
      } else {
        setParsedRows(rows);
        setParseError(null);
      }
    };
    reader.readAsText(file);
  };

  // Clear all state
  const handleClear = () => {
    setParsedRows([]);
    setParseError(null);
    setActiveBatchId(null);
    setStagingRows([]);
    setActiveTab('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Insert to staging — generates ONE batchId per attempt
  const handleInsertToStaging = async () => {
    if (!crmUserId) {
      toast({ title: 'Not authenticated', description: 'CRM user ID not available.', variant: 'destructive' });
      return;
    }
    if (!(await verifySession('insert'))) return;

    setInserting(true);
    const batchId = crypto.randomUUID();
    const { count, error } = await insertStagingRows(batchId, crmUserId, parsedRows);

    if (error) {
      toast({ title: 'Insert failed', description: error, variant: 'destructive' });
      setInserting(false);
      return;
    }

    setActiveBatchId(batchId);
    toast({ title: 'Inserted', description: `${count} rows inserted into staging.` });

    setStagingLoading(true);
    const { data } = await fetchStagingRows(batchId);
    setStagingRows(data);
    setStagingLoading(false);
    setInserting(false);
  };

  // Validate batch
  const handleValidate = async () => {
    if (!activeBatchId) return;
    if (!(await verifySession('validate'))) return;

    setValidating(true);
    const { error } = await validateImportBatch(activeBatchId);

    if (error) {
      toast({ title: 'Validation failed', description: error, variant: 'destructive' });
      setValidating(false);
      return;
    }

    // Always refetch from DB
    setStagingLoading(true);
    const { data: freshRows } = await fetchStagingRows(activeBatchId);
    setStagingRows(freshRows);
    setStagingLoading(false);
    setValidating(false);

    const freshValidated = freshRows.filter((r) => r.status === 'VALIDATED').length;
    const freshFailed = freshRows.filter((r) => r.status === 'FAILED').length;
    const freshDuplicate = freshRows.filter((r) => r.status === 'DUPLICATE').length;

    toast({ title: 'Validation complete', description: `${freshValidated} valid, ${freshFailed} failed, ${freshDuplicate} duplicates.` });

    if (freshFailed > 0) setActiveTab('failed');
    else if (freshValidated > 0) setActiveTab('validated');
  };

  // Import validated contacts — RPC only, no client-side fallback
  const handleImport = async () => {
    if (!activeBatchId || !crmUserId) return;
    if (!(await verifySession('import'))) return;

    setImporting(true);

    console.log('[BulkImport] Calling import_validated_contacts RPC for batch:', activeBatchId);
    const { data, error } = await importValidatedContacts(activeBatchId);

    if (error) {
      console.error('[BulkImport] RPC import_validated_contacts failed:', error);
      toast({
        title: 'Bulk Import Failed',
        description: error,
        variant: 'destructive',
        duration: 10000,
      });
      setImporting(false);
      return;
    }

    console.log('[BulkImport] Import complete:', data);

    const row = Array.isArray(data) ? data[0] : data;
    const eligible = Number((row as any)?.eligible_count ?? 0);
    const imported = Number((row as any)?.imported_count ?? 0);
    const skipped = Number((row as any)?.skipped_duplicate_count ?? 0);

    console.log(`[BulkImport] Imported: ${imported}, Skipped: ${skipped}, Eligible: ${eligible}`);
    if (skipped > 0) {
      console.log(`[BulkImport] Duplicates found: ${skipped}`);
    }

    if (eligible === 0) {
      toast({ title: 'Import Complete', description: 'Import complete: no validated rows to import.', duration: 6000 });
    } else if (imported === 0 && skipped === 0) {
      toast({ title: 'Import Complete', description: 'Import completed but no rows changed. Please refresh.', duration: 6000 });
    } else {
      toast({ title: 'Import Complete!', description: `Imported ${imported}, Duplicates skipped ${skipped}.`, duration: 6000 });
    }

    // Refetch staging rows
    setStagingLoading(true);
    const { data: freshRows } = await fetchStagingRows(activeBatchId);
    setStagingRows(freshRows);
    setStagingLoading(false);

    // Refresh contact lists
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
    queryClient.invalidateQueries({ queryKey: ['unassigned-contacts'] });
    queryClient.invalidateQueries({ queryKey: ['my-added-contacts'] });

    // If duplicates exist, switch to duplicates tab
    if (skipped > 0) {
      setActiveTab('duplicates');
    }

    setImporting(false);
  };

  // Download template
  const handleDownloadTemplate = () => {
    const content = generateCsvTemplate();
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contact_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auth guard
  if (!crmUserId && crmUser) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Contact Import</h1>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">Not authenticated in CRM. Please login via Google SSO.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canInsert = parsedRows.length > 0 && !activeBatchId && !inserting;
  const canValidate = !!activeBatchId && !validating && pendingRows.length > 0;
  const canImport = validatedRows.length > 0 && !importing;

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bulk Contact Import</h1>
            <p className="mt-1 text-muted-foreground">
              Upload CSV, validate for errors/duplicates, then import.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV Template
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Button variant="outline" size="sm" onClick={handleUploadClick} disabled={!!activeBatchId}>
            <FileUp className="mr-2 h-4 w-4" />
            {parsedRows.length > 0 ? `${parsedRows.length} rows parsed` : 'Upload CSV'}
          </Button>

          <Button variant="ghost" size="sm" onClick={handleClear} disabled={parsedRows.length === 0 && !activeBatchId}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>

          <Button size="sm" disabled={!canInsert} onClick={handleInsertToStaging}>
            {inserting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Insert to Staging
          </Button>

          <Button size="sm" variant="secondary" disabled={!canValidate} onClick={handleValidate}>
            {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Validate Batch
          </Button>

          <ImportConfirmDialog validCount={validatedRows.length} disabled={!canImport} loading={importing} onConfirm={handleImport} />

          {activeBatchId && (
            <Button variant="outline" size="sm" disabled={stagingLoading} onClick={loadStagingRows}>
              {stagingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Parse error */}
      {parseError && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{parseError}</p>
          </CardContent>
        </Card>
      )}

      {/* CSV Preview */}
      {parsedRows.length > 0 && !activeBatchId && <CsvPreviewTable rows={parsedRows} />}

      {/* KPI Cards */}
      {activeBatchId && hasBeenValidated && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KPICard title="Total Rows" value={stagingRows.length} icon={ListChecks} variant="muted" />
          <KPICard title="Validated" value={validatedRows.length} icon={CheckCircle2} variant="success" />
          <KPICard title="Failed" value={failedRows.length} icon={XCircle} variant="warning" />
          <KPICard title="Duplicates" value={duplicateRows.length} icon={AlertTriangle} variant="default" />
          <KPICard title="Imported" value={importedRows.length} icon={CheckCircle2} variant="muted" />
        </div>
      )}

      {/* Staging tables */}
      {activeBatchId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All Rows <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{stagingRows.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="validated">
              Validated <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{validatedRows.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed {failedRows.length > 0 && <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">{failedRows.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="duplicates">
              Duplicates {duplicateRows.length > 0 && <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-xs">{duplicateRows.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <StagingTable rows={stagingRows} isLoading={stagingLoading} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="validated" className="mt-4">
            <StagingTable rows={validatedRows} isLoading={stagingLoading} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="failed" className="mt-4">
            <StagingTable rows={failedRows} isLoading={stagingLoading} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="duplicates" className="mt-4">
            <StagingTable rows={duplicateRows} isLoading={stagingLoading} isAdmin={isAdmin} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
