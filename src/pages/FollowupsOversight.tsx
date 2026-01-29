import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { OversightKPITiles } from '@/components/followups-oversight/OversightKPITiles';
import { OverdueByCallerTable } from '@/components/followups-oversight/OverdueByCallerTable';
import { SlippingContactsTable } from '@/components/followups-oversight/SlippingContactsTable';
import { CallerDrilldownDrawer } from '@/components/followups-oversight/CallerDrilldownDrawer';
import { Next7DaysTable } from '@/components/followups-oversight/Next7DaysTable';
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
    }
  }, [hasAccess]);

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

      {/* KPI Tiles - override next7Days count with actual RPC data length */}
      <OversightKPITiles 
        kpis={kpis ? { ...kpis, next7Days: next7Days?.length ?? kpis.next7Days } : null} 
        isLoading={isLoadingKPIs || isLoadingNext7Days} 
        error={kpisError} 
      />

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
