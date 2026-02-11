import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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

interface BulkImportTabProps {
  onImportComplete?: (importedCount: number, skippedCount: number) => void;
}

export function BulkImportTab({ onImportComplete }: BulkImportTabProps) {
  const { isAdmin, crmUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [stagingRows, setStagingRows] = useState<StagingRow[]>([]);
  const [stagingLoading, setStagingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  // Operation loading states
  const [inserting, setInserting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);



  // Use CRM user ID directly from AuthContext (not a separate RPC)
  const crmUserId = crmUser?.id ?? null;

  // Session safety check: verify auth session AND DB-level current_crm_user_id match the UI user
  const verifySession = async (operationName: string): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Session expired', description: 'Please log in again.', variant: 'destructive' });
      return false;
    }
    const sessionEmail = session.user.email;
    const uiEmail = crmUser?.email;
    console.log(`[BulkImport:${operationName}] auth.uid=${session.user.id}, session_email=${sessionEmail}, ui_email=${uiEmail}, ui_crmUserId=${crmUserId}`);

    if (uiEmail && sessionEmail && sessionEmail.toLowerCase() !== uiEmail.toLowerCase()) {
      toast({
        title: 'User mismatch',
        description: `Session belongs to ${sessionEmail} but UI shows ${uiEmail}. Please log out and log back in.`,
        variant: 'destructive',
      });
      return false;
    }

    // Also verify at DB level — current_crm_user_id() must match crmUser.id
    const { data: dbCrmId, error: rpcErr } = await supabase.rpc('current_crm_user_id');
    console.log(`[BulkImport:${operationName}] DB current_crm_user_id()=${dbCrmId}, expected=${crmUserId}, rpcErr=${rpcErr?.message}`);
    if (rpcErr) {
      toast({ title: 'Auth verification failed', description: rpcErr.message, variant: 'destructive' });
      return false;
    }
    if (dbCrmId !== crmUserId) {
      toast({
        title: 'Identity mismatch',
        description: `DB sees user ${dbCrmId} but UI user is ${crmUserId}. Please log out and log back in.`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  // Filtered staging rows — derived counts replace RPC-returned validationResult
  const pendingRows = stagingRows.filter((r) => r.status === 'PENDING' || r.status === 'NEW');
  const validatedRows = stagingRows.filter((r) => r.status === 'VALIDATED');
  const failedRows = stagingRows.filter((r) => r.status === 'FAILED');
  const duplicateRows = stagingRows.filter((r) => r.status === 'DUPLICATE');
  const importedRows = stagingRows.filter((r) => r.status === 'IMPORTED');

  const hasBeenValidated = stagingRows.length > 0 && pendingRows.length === 0;

  // Load staging rows for active batch
  const loadStagingRows = useCallback(async () => {
    if (!activeBatchId) return;
    setStagingLoading(true);
    const { data } = await fetchStagingRows(activeBatchId);
    setStagingRows(data);
    setStagingLoading(false);
  }, [activeBatchId]);

  // File upload handler
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

  // Insert to staging
  const handleInsertToStaging = async () => {
    if (!crmUserId) {
      toast({
        title: 'Not authenticated',
        description: 'CRM user ID not available. Please login via Google SSO.',
        variant: 'destructive',
      });
      return;
    }

    if (!(await verifySession('insert'))) { setInserting(false); return; }
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

    // Load the staging rows
    setStagingLoading(true);
    const { data } = await fetchStagingRows(batchId);
    setStagingRows(data);
    setStagingLoading(false);
    setInserting(false);
  };

  // Validate batch — run RPC then ALWAYS refetch rows; derive counts from refetched data
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

    // Always refetch rows from DB — the source of truth
    await loadStagingRows();
    setValidating(false);

    // Toast with counts derived from refetched rows (computed above via filter)
    // We need to read them after loadStagingRows, but state is async, so we fetch inline
    const { data: freshRows } = await fetchStagingRows(activeBatchId);
    const freshValidated = freshRows.filter((r) => r.status === 'VALIDATED').length;
    const freshFailed = freshRows.filter((r) => r.status === 'FAILED').length;
    const freshDuplicate = freshRows.filter((r) => r.status === 'DUPLICATE').length;

    toast({
      title: 'Validation complete',
      description: `${freshValidated} valid, ${freshFailed} failed, ${freshDuplicate} duplicates.`,
    });

    // Auto-switch tab based on results
    if (freshFailed > 0) {
      setActiveTab('failed');
    } else if (freshValidated > 0) {
      setActiveTab('validated');
    }
  };

  // Import validated
  const handleImport = async () => {
    if (!activeBatchId) return;
    if (!(await verifySession('import'))) return;
    setImporting(true);
    const { data, error } = await importValidatedContacts(activeBatchId);

    if (error) {
      console.error('[BulkImport] RPC import_validated_contacts failed:', error);
      toast({ title: 'Import failed', description: error, variant: 'destructive' });
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

    // Always refresh staging rows and summary
    await loadStagingRows();

    // Notify parent
    onImportComplete?.(imported, skipped);
    setImporting(false);
  };

  // Download CSV template
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
      <Card>
        <CardContent className="flex items-center gap-3 p-6">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">
            Not authenticated in CRM. Please login via Google SSO.
          </p>
        </CardContent>
      </Card>
    );
  }

  const canInsert = parsedRows.length > 0 && !activeBatchId && !inserting;
  const canValidate = !!activeBatchId && !validating && pendingRows.length > 0;
  const canImport = validatedRows.length > 0 && !importing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Bulk Import Contacts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a CSV to add multiple contacts at once. Imported contacts appear in <strong>My Added</strong> and the <strong>Unassigned</strong> pool.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          Download CSV Template
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={parsedRows.length === 0 && !activeBatchId}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>

          <Button
            size="sm"
            disabled={!canInsert}
            onClick={handleInsertToStaging}
          >
            {inserting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Insert to Staging
          </Button>

          <Button
            size="sm"
            variant="secondary"
            disabled={!canValidate}
            onClick={handleValidate}
          >
            {validating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Validate Batch
          </Button>

          <ImportConfirmDialog
            validCount={validatedRows.length}
            disabled={!canImport}
            loading={importing}
            onConfirm={handleImport}
          />

          {activeBatchId && (
            <Button
              variant="outline"
              size="sm"
              disabled={stagingLoading}
              onClick={loadStagingRows}
            >
              {stagingLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
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

      {/* CSV Preview (before staging insert) */}
      {parsedRows.length > 0 && !activeBatchId && (
        <CsvPreviewTable rows={parsedRows} />
      )}

      {/* KPI Cards — derived from actual staging rows */}
      {activeBatchId && hasBeenValidated && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KPICard
            title="Total Rows"
            value={stagingRows.length}
            icon={ListChecks}
            variant="muted"
          />
          <KPICard
            title="Validated"
            value={validatedRows.length}
            icon={CheckCircle2}
            variant="success"
          />
          <KPICard
            title="Failed"
            value={failedRows.length}
            icon={XCircle}
            variant="warning"
          />
          <KPICard
            title="Duplicates"
            value={duplicateRows.length}
            icon={AlertTriangle}
            variant="default"
          />
          <KPICard
            title="Imported"
            value={importedRows.length}
            icon={CheckCircle2}
            variant="muted"
          />
        </div>
      )}

      {/* Staging tables with tabs */}
      {activeBatchId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              All Rows
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {stagingRows.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="validated">
              Validated
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {validatedRows.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="failed">
              Failed
              {failedRows.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">
                  {failedRows.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="duplicates">
              Duplicates
              {duplicateRows.length > 0 && (
                <Badge variant="outline" className="ml-1.5 h-5 px-1.5 text-xs">
                  {duplicateRows.length}
                </Badge>
              )}
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
