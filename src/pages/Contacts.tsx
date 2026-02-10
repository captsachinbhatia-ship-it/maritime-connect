import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { UnassignedContactsTab } from '@/components/contacts/UnassignedContactsTab';
import { DirectoryTab } from '@/components/contacts/DirectoryTab';
import { MyContactsTab } from '@/components/contacts/MyContactsTab';
import { MyAddedContactsTab } from '@/components/contacts/MyAddedContactsTab';
import { SecondaryContactsTab } from '@/components/contacts/SecondaryContactsTab';
import { DuplicateRiskTab } from '@/components/contacts/DuplicateRiskTab';
import { PendingInactiveRequestsTab } from '@/components/contacts/PendingInactiveRequestsTab';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserPlus, Users2, AlertTriangle, Clock, BookOpen, FileUp } from 'lucide-react';

type TabType = 'directory' | 'my-contacts' | 'unassigned' | 'my-added' | 'secondary' | 'duplicate-risk' | 'pending-requests';

const ALL_TABS: TabType[] = ['directory', 'my-contacts', 'secondary', 'my-added', 'unassigned', 'duplicate-risk', 'pending-requests'];

export default function Contacts() {
  const { user, crmUser, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ALL_TABS.includes(tabParam as TabType)) return tabParam as TabType;
    return 'directory';
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Counts
  const [secondaryCount, setSecondaryCount] = useState(0);
  const [directoryCount, setDirectoryCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [duplicateRiskCount, setDuplicateRiskCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [myAddedCount, setMyAddedCount] = useState(0);
  const [myContactsCount, setMyContactsCount] = useState(0);

  // Sync tab from URL param (keep param in URL for deep-link / refresh)
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ALL_TABS.includes(tabParam as TabType) && tabParam !== activeTab) {
      setActiveTab(tabParam as TabType);
    }
  }, [searchParams]);

  useEffect(() => {
    const checkRole = async () => {
      if (!crmUser || !user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const hasAdminAccess = data?.role === 'ADMIN' || data?.role === 'CEO';
      setIsAdmin(hasAdminAccess);
    };

    if (!authLoading && crmUser) {
      checkRole();
    } else if (!authLoading) {
      setIsAdmin(false);
    }
  }, [user, crmUser, authLoading]);

  // Fetch all counts
  const loadCounts = useCallback(async () => {
    if (!crmUser) return;

    const currentCrmUserId = crmUser.id;
    if (!currentCrmUserId) return;

    // Secondary
    const { count: secCount } = await supabase
      .from('contact_assignments')
      .select('contact_id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')
      .eq('assigned_to_crm_user_id', currentCrmUserId)
      .in('assignment_role', ['SECONDARY', 'secondary']);
    setSecondaryCount(secCount || 0);

    // Directory (ALL contacts)
    const { count: dirCount } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true });
    setDirectoryCount(dirCount || 0);

    // My Contacts (primary owned by current user)
    const { count: myCount } = await supabase
      .from('contact_assignments')
      .select('contact_id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')
      .eq('assigned_to_crm_user_id', currentCrmUserId)
      .in('assignment_role', ['PRIMARY', 'primary']);
    setMyContactsCount(myCount || 0);

    // My Added
    const { count: addedCount } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_crm_user_id', currentCrmUserId);
    setMyAddedCount(addedCount || 0);

    // Admin-only counts
    try {
      const { count: unCount } = await supabase
        .from('v_unassigned_contacts')
        .select('*', { count: 'exact', head: true });
      setUnassignedCount(unCount || 0);
    } catch { setUnassignedCount(0); }

    try {
      const { count: dupCount } = await supabase
        .from('contact_duplicate_risk')
        .select('*', { count: 'exact', head: true });
      setDuplicateRiskCount(dupCount || 0);
    } catch { setDuplicateRiskCount(0); }

    try {
      const { count: pendCount } = await supabase
        .from('v_pending_inactive_requests')
        .select('*', { count: 'exact', head: true });
      setPendingRequestsCount(pendCount || 0);
    } catch { setPendingRequestsCount(0); }
  }, [crmUser]);

  useEffect(() => {
    if (!authLoading && crmUser) {
      loadCounts();
    }
  }, [authLoading, crmUser, loadCounts]);

  const handleContactAdded = () => {
    setRefreshKey(prev => prev + 1);
    loadCounts();
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val as TabType);
    setSearchParams({ tab: val }, { replace: true });
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
            <p className="mt-1 text-muted-foreground">Manage your contact records</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="mt-1 text-muted-foreground">
            {isAdmin
              ? 'Manage contact assignments and ownership'
              : 'View contacts and manage your assigned pipeline'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/contacts/bulk-import')}>
            <FileUp className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <AddContactModal onSuccess={handleContactAdded} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground">
            <TabsTrigger
              value="directory"
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Directory ({directoryCount})
            </TabsTrigger>
            <TabsTrigger
              value="my-contacts"
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              My Contacts ({myContactsCount})
            </TabsTrigger>
            <TabsTrigger
              value="secondary"
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Users2 className="h-3.5 w-3.5" />
              Secondary ({secondaryCount})
            </TabsTrigger>
            <TabsTrigger
              value="my-added"
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              My Added ({myAddedCount})
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger
                value="unassigned"
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Unassigned ({unassignedCount})
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger
                value="duplicate-risk"
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Duplicate Risk ({duplicateRiskCount})
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger
                value="pending-requests"
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Clock className="h-3.5 w-3.5" />
                Pending ({pendingRequestsCount})
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="directory" className="mt-4">
          <DirectoryTab key={`directory-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="my-contacts" className="mt-4">
          <MyContactsTab key={`mycontacts-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="secondary" className="mt-4">
          <SecondaryContactsTab key={`secondary-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="my-added" className="mt-4">
          <MyAddedContactsTab key={`added-${refreshKey}`} onRefresh={loadCounts} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="unassigned" className="mt-4">
            <UnassignedContactsTab key={`unassigned-${refreshKey}`} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="duplicate-risk" className="mt-4">
            <DuplicateRiskTab key={`duplicate-risk-${refreshKey}`} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="pending-requests" className="mt-4">
            <PendingInactiveRequestsTab key={`pending-requests-${refreshKey}`} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
