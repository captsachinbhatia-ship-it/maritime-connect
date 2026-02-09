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
} from 'lucide-react';

import { KPICard } from '@/components/dashboard/KPICard';
import { CsvPreviewTable } from '@/components/bulk-import/CsvPreviewTable';
import { StagingTable } from '@/components/bulk-import/StagingTable';
import { ImportConfirmDialog } from '@/components/bulk-import/ImportConfirmDialog';
import { parseCsvContent, generateCsvTemplate } from '@/lib/csvParser';
import {
  getCurrentCrmUserIdViaRpc,
  insertStagingRows,
  fetchStagingRows,
  validateImportBatch,
  importValidatedContacts,
  importValidatedContactsClientSide,
} from '@/services/bulkImport';
import type { ParsedCsvRow, StagingRow, ValidationResult, ImportValidatedResult } from '@/services/bulkImport';

export default function BulkImport() {
  const { isAdmin, crmUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [stagingRows, setStagingRows] = useState<StagingRow[]>([]);
  const [stagingLoading, setStagingLoading] = useState(false);
  // skipDuplicates removed — new RPC always marks them SKIPPED_DUPLICATE
  const [activeTab, setActiveTab] = useState('all');
  const [crmUserId, setCrmUserId] = useState<string | null>(null);
  const [crmIdError, setCrmIdError] = useState<string | null>(null);

  // Operation loading states
  const [inserting, setInserting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  // Validation results
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Resolve CRM user ID on mount
  useEffect(() => {
    async function resolve() {
      const { data, error } = await getCurrentCrmUserIdViaRpc();
      if (error || !data) {
        setCrmIdError(error || 'CRM user ID could not be resolved.');
      } else {
        setCrmUserId(data);
      }
    }
    if (crmUser) resolve();
  }, [crmUser]);

  // Filtered staging rows
  const validatedRows = stagingRows.filter((r) => r.status === 'VALIDATED');
  const failedRows = stagingRows.filter((r) => r.status === 'FAILED');
  const duplicateRows = stagingRows.filter((r) => r.status === 'DUPLICATE');

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
    setValidationResult(null);
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

  // Validate batch
  const handleValidate = async () => {
    if (!activeBatchId) return;
    setValidating(true);
    const { data, error } = await validateImportBatch(activeBatchId);

    if (error) {
      toast({ title: 'Validation failed', description: error, variant: 'destructive' });
      setValidating(false);
      return;
    }

    setValidationResult(data);
    await loadStagingRows();

    // Auto-switch tab
    if (data && data.failed_rows > 0) {
      setActiveTab('failed');
    } else {
      setActiveTab('validated');
    }

    toast({ title: 'Validation complete', description: `${data?.valid_rows || 0} valid, ${data?.failed_rows || 0} failed, ${data?.duplicate_rows || 0} duplicates.` });
    setValidating(false);
  };

  // Import validated
  const handleImport = async () => {
    if (!activeBatchId || !crmUserId) return;
    setImporting(true);

    // Try RPC first
    let { data, error } = await importValidatedContacts(activeBatchId);

    // If RPC fails, fall back to client-side import
    if (error || (data && data.imported_count === 0 && validatedRows.length > 0)) {
      console.warn('[BulkImport] RPC failed or imported 0, falling back to client-side import. Error:', error);
      const fallback = await importValidatedContactsClientSide(activeBatchId, crmUserId);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      toast({ title: 'Import failed', description: error, variant: 'destructive' });
      setImporting(false);
      return;
    }

    await loadStagingRows();

    if (data) {
      toast({
        title: 'Import complete',
        description: `Imported ${data.imported_count} contacts${data.skipped_duplicate_count > 0 ? ` (${data.skipped_duplicate_count} duplicates skipped)` : ''}`,
      });
      if (data.skipped_duplicate_count > 0) {
        setActiveTab('duplicates');
      }
    }
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
  if (crmIdError || (!crmUserId && crmUser)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Contact Import</h1>
          <p className="mt-1 text-muted-foreground">Upload CSV, validate for errors/duplicates, then import.</p>
        </div>
        <Card>
          <CardContent className="flex items-center gap-3 p-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Not authenticated in CRM. Please login via Google SSO.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canInsert = parsedRows.length > 0 && !activeBatchId && !inserting;
  const canValidate = !!activeBatchId && !validating;
  const canImport = !!validationResult && (validationResult.valid_rows > 0) && !importing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bulk Contact Import</h1>
          <p className="mt-1 text-muted-foreground">
            Upload CSV, validate for errors/duplicates, then import.
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
            validCount={validationResult?.valid_rows ?? 0}
            disabled={!canImport}
            loading={importing}
            onConfirm={handleImport}
          />
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

      {/* KPI Cards (after validation) */}
      {validationResult && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            title="Total Rows"
            value={validationResult.total_rows}
            icon={ListChecks}
            variant="muted"
          />
          <KPICard
            title="Valid Rows"
            value={validationResult.valid_rows}
            icon={CheckCircle2}
            variant="success"
          />
          <KPICard
            title="Failed Rows"
            value={validationResult.failed_rows}
            icon={XCircle}
            variant="warning"
          />
          <KPICard
            title="Duplicate Rows"
            value={validationResult.duplicate_rows}
            icon={AlertTriangle}
            variant="default"
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
