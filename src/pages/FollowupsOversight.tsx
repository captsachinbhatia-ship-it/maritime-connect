import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert, RefreshCw, Bug } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OversightKPITiles } from '@/components/followups-oversight/OversightKPITiles';
import { OverdueByCallerTable } from '@/components/followups-oversight/OverdueByCallerTable';
import { SlippingContactsTable } from '@/components/followups-oversight/SlippingContactsTable';
import { CallerDrilldownDrawer } from '@/components/followups-oversight/CallerDrilldownDrawer';
import { Next7DaysTable } from '@/components/followups-oversight/Next7DaysTable';
import { supabase } from '@/lib/supabaseClient';
import {
  checkIsAdmin,
  getOversightKPIs,
  getOverdueByCaller,
  getSlippingContacts,
  getNext7DaysFollowups,
  OversightKPIs,
  OverdueByCaller,
  SlippingContact,
  Next7DaysFollowup,
} from '@/services/followupsOversight';

export default function FollowupsOversight() {
  const navigate = useNavigate();

  // Access control state
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  // Data state
  const [kpis, setKpis] = useState<OversightKPIs | null>(null);
  const [overdueByCaller, setOverdueByCaller] = useState<OverdueByCaller[] | null>(null);
  const [slippingContacts, setSlippingContacts] = useState<SlippingContact[] | null>(null);
  const [next7Days, setNext7Days] = useState<Next7DaysFollowup[] | null>(null);

  // Loading states
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(false);
  const [isLoadingOverdue, setIsLoadingOverdue] = useState(false);
  const [isLoadingSlipping, setIsLoadingSlipping] = useState(false);
  const [isLoadingNext7Days, setIsLoadingNext7Days] = useState(false);

  // Error states
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [overdueError, setOverdueError] = useState<string | null>(null);
  const [slippingError, setSlippingError] = useState<string | null>(null);
  const [next7DaysError, setNext7DaysError] = useState<string | null>(null);

  // DEBUG state
  const [debugOverview, setDebugOverview] = useState<{ data: any; error: any } | null>(null);
  const [debugNext7Days, setDebugNext7Days] = useState<{ count: number; firstRow: any; error: any } | null>(null);
  const [isLoadingDebug, setIsLoadingDebug] = useState(false);

  // Drawer state
  const [drilldownCaller, setDrilldownCaller] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Check access on mount
  useEffect(() => {
    checkAccess();
  }, []);

  // Load data when access is granted
  useEffect(() => {
    if (hasAccess) {
      loadAllData();
      loadDebugData();
    }
  }, [hasAccess]);

  // DEBUG: Load raw RPC output
  const loadDebugData = async () => {
    setIsLoadingDebug(true);
    
    // Call rpc_followups_debug_overview
    const { data: overviewData, error: overviewError } = await supabase.rpc('rpc_followups_debug_overview');
    setDebugOverview({ data: overviewData, error: overviewError?.message || null });

    // Call rpc_followups_next_7_days
    const { data: next7Data, error: next7Error } = await supabase.rpc('rpc_followups_next_7_days');
    setDebugNext7Days({
      count: Array.isArray(next7Data) ? next7Data.length : 0,
      firstRow: Array.isArray(next7Data) && next7Data.length > 0 ? next7Data[0] : null,
      error: next7Error?.message || null,
    });

    setIsLoadingDebug(false);
  };

  const checkAccess = async () => {
    setIsCheckingAccess(true);
    const result = await checkIsAdmin();

    if (result.error) {
      setAccessError(result.error);
      setHasAccess(false);
    } else {
      setHasAccess(result.isAdmin);
    }

    setIsCheckingAccess(false);
  };

  const loadAllData = async () => {
    loadKPIs();
    loadOverdueByCaller();
    loadSlippingContacts();
    loadNext7Days();
  };

  const loadKPIs = async () => {
    setIsLoadingKPIs(true);
    setKpisError(null);
    const result = await getOversightKPIs();
    if (result.error) {
      setKpisError(result.error);
    } else {
      setKpis(result.data);
    }
    setIsLoadingKPIs(false);
  };

  const loadOverdueByCaller = async () => {
    setIsLoadingOverdue(true);
    setOverdueError(null);
    const result = await getOverdueByCaller();
    if (result.error) {
      setOverdueError(result.error);
    } else {
      setOverdueByCaller(result.data);
    }
    setIsLoadingOverdue(false);
  };

  const loadSlippingContacts = async () => {
    setIsLoadingSlipping(true);
    setSlippingError(null);
    const result = await getSlippingContacts();
    if (result.error) {
      // Handle access restriction from RPC
      if (result.error === 'Access restricted') {
        setAccessError(result.error);
        setHasAccess(false);
      }
      setSlippingError(result.error);
    } else {
      setSlippingContacts(result.data);
    }
    setIsLoadingSlipping(false);
  };

  const loadNext7Days = async () => {
    setIsLoadingNext7Days(true);
    setNext7DaysError(null);
    const result = await getNext7DaysFollowups();
    if (result.error) {
      // Handle access restriction from RPC
      if (result.error === 'Access restricted') {
        setAccessError(result.error);
        setHasAccess(false);
      }
      setNext7DaysError(result.error);
    } else {
      setNext7Days(result.data);
    }
    setIsLoadingNext7Days(false);
  };

  const handleViewList = (callerId: string, callerName: string) => {
    setDrilldownCaller({ id: callerId, name: callerName });
  };

  // Loading state
  if (isCheckingAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Alert variant="destructive">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription className="mt-2">
            {accessError || 'You do not have permission to view this page. This page is restricted to Admin/CEO users only.'}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* DEBUG CARD - Temporary */}
      <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Bug className="h-5 w-5" />
            DEBUG: Raw RPC Output (Temporary)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingDebug ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading debug data...
            </div>
          ) : (
            <>
              {/* rpc_followups_debug_overview */}
              <div>
                <h4 className="font-semibold text-sm mb-1">rpc_followups_debug_overview:</h4>
                {debugOverview?.error ? (
                  <pre className="text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded text-red-700 dark:text-red-300 overflow-auto max-h-40">
                    Error: {debugOverview.error}
                  </pre>
                ) : (
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(debugOverview?.data, null, 2) || 'null'}
                  </pre>
                )}
              </div>

              {/* rpc_followups_next_7_days */}
              <div>
                <h4 className="font-semibold text-sm mb-1">rpc_followups_next_7_days:</h4>
                {debugNext7Days?.error ? (
                  <pre className="text-xs bg-red-100 dark:bg-red-900/30 p-2 rounded text-red-700 dark:text-red-300 overflow-auto max-h-40">
                    Error: {debugNext7Days.error}
                  </pre>
                ) : (
                  <div className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                    <p><strong>next7_rows:</strong> {debugNext7Days?.count ?? 0}</p>
                    {debugNext7Days?.firstRow && (
                      <div className="mt-2">
                        <p className="font-semibold">First row:</p>
                        <pre>{JSON.stringify(debugNext7Days.firstRow, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button variant="outline" size="sm" onClick={loadDebugData}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh Debug
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Follow-ups Oversight</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Management
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Company-wide follow-up health and risk monitoring
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadAllData}
          disabled={isLoadingKPIs || isLoadingOverdue || isLoadingSlipping || isLoadingNext7Days}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${(isLoadingKPIs || isLoadingOverdue || isLoadingSlipping || isLoadingNext7Days) ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Tiles */}
      <OversightKPITiles kpis={kpis} isLoading={isLoadingKPIs} error={kpisError} />

      {/* Two-column layout for top tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue by Caller */}
        <OverdueByCallerTable
          data={overdueByCaller}
          isLoading={isLoadingOverdue}
          error={overdueError}
          onViewList={handleViewList}
        />

        {/* Next 7 Days */}
        <Next7DaysTable
          data={next7Days}
          isLoading={isLoadingNext7Days}
          error={next7DaysError}
        />
      </div>

      {/* Slipping Contacts - full width */}
      <SlippingContactsTable
        data={slippingContacts}
        isLoading={isLoadingSlipping}
        error={slippingError}
      />

      {/* Caller Drilldown Drawer */}
      <CallerDrilldownDrawer
        callerId={drilldownCaller?.id || null}
        callerName={drilldownCaller?.name || ''}
        isOpen={!!drilldownCaller}
        onClose={() => setDrilldownCaller(null)}
      />
    </div>
  );
}
