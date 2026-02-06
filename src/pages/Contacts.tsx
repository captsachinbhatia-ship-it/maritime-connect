import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { UnassignedContactsTab } from '@/components/contacts/UnassignedContactsTab';
import { AssignedContactsTab } from '@/components/contacts/AssignedContactsTab';
import { MyContactsTab } from '@/components/contacts/MyContactsTab';
import { MyAddedContactsTab } from '@/components/contacts/MyAddedContactsTab';
import { SecondaryContactsTab } from '@/components/contacts/SecondaryContactsTab';
import { BulkImportTab } from '@/components/contacts/BulkImportTab';
import { DuplicateRiskTab } from '@/components/contacts/DuplicateRiskTab';
import { PendingInactiveRequestsTab } from '@/components/contacts/PendingInactiveRequestsTab';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserPlus, Users2, FileUp, AlertTriangle, Clock } from 'lucide-react';
import { getCurrentCrmUserId } from '@/services/profiles';

type TabType = 'all-contacts' | 'unassigned' | 'my-contacts' | 'my-added' | 'secondary' | 'bulk-import' | 'duplicate-risk' | 'pending-requests';

export default function Contacts() {
  const { user, crmUser, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'bulk-import' || tabParam === 'my-added') return tabParam as TabType;
    return 'my-contacts';
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [myAddedCount, setMyAddedCount] = useState(0);
  const [secondaryCount, setSecondaryCount] = useState(0);

  // Sync tab from URL param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'bulk-import' || tabParam === 'my-added') {
      setActiveTab(tabParam as TabType);
      // Clear the param after applying
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  // Fetch count of contacts created by current user
  const loadMyAddedCount = useCallback(async () => {
    if (!crmUser) return;
    
    const { data: currentCrmUserId } = await getCurrentCrmUserId();
    if (!currentCrmUserId) return;
    
    const { count, error } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_crm_user_id', currentCrmUserId);
    
    if (!error && count !== null) {
      setMyAddedCount(count);
    }
  }, [crmUser]);

  // Fetch count of secondary contacts for current user
  const loadSecondaryCount = useCallback(async () => {
    if (!crmUser) return;
    
    const { data: currentCrmUserId } = await getCurrentCrmUserId();
    if (!currentCrmUserId) return;
    
    const { count, error } = await supabase
      .from('contact_assignments')
      .select('contact_id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')
      .eq('assigned_to_crm_user_id', currentCrmUserId)
      .eq('assignment_role', 'SECONDARY');
    
    if (!error && count !== null) {
      setSecondaryCount(count);
    }
  }, [crmUser]);

  useEffect(() => {
    if (!authLoading && crmUser) {
      loadMyAddedCount();
      loadSecondaryCount();
    }
  }, [authLoading, crmUser, loadMyAddedCount, loadSecondaryCount]);

  const handleContactAdded = () => {
    setRefreshKey(prev => prev + 1);
    loadMyAddedCount();
    loadSecondaryCount();
  };

  const handleImportComplete = () => {
    // Navigate to My Added tab and refresh counts
    setActiveTab('my-added');
    setRefreshKey(prev => prev + 1);
    loadMyAddedCount();
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val as TabType);
  };

  // Show loading while checking role
  if (authLoading || isAdmin === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your contact records
            </p>
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
              : 'View contacts and manage your assigned pipeline'
            }
          </p>
        </div>
        <AddContactModal onSuccess={handleContactAdded} />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="my-contacts" className="font-semibold">
            My Contacts
          </TabsTrigger>
          <TabsTrigger value="secondary" className="flex items-center gap-1.5">
            <Users2 className="h-3.5 w-3.5" />
            Secondary
            {secondaryCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {secondaryCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all-contacts">All Contacts</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="duplicate-risk" className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Duplicate Risk
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="pending-requests" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Pending Requests
            </TabsTrigger>
          )}
          <TabsTrigger value="my-added" className="flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            My Added
            {myAddedCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {myAddedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="bulk-import"
            className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <FileUp className="h-3.5 w-3.5" />
            Bulk Import
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] font-semibold border-amber-500 text-amber-600 dark:text-amber-400">
              ⭐
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-contacts" className="mt-4">
          <MyContactsTab key={`my-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="secondary" className="mt-4">
          <SecondaryContactsTab key={`secondary-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="all-contacts" className="mt-4">
          <AssignedContactsTab key={`assigned-${refreshKey}`} />
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

        <TabsContent value="my-added" className="mt-4">
          <MyAddedContactsTab key={`added-${refreshKey}`} onRefresh={loadMyAddedCount} />
        </TabsContent>

        <TabsContent value="bulk-import" className="mt-4">
          <BulkImportTab key={`import-${refreshKey}`} onImportComplete={handleImportComplete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
