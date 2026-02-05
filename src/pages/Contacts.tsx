import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AddContactModal } from '@/components/contacts/AddContactModal';
import { UnassignedContactsTab } from '@/components/contacts/UnassignedContactsTab';
import { AssignedContactsTab } from '@/components/contacts/AssignedContactsTab';
import { MyContactsTab } from '@/components/contacts/MyContactsTab';
import { MyAddedContactsTab } from '@/components/contacts/MyAddedContactsTab';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserPlus } from 'lucide-react';
import { getCurrentCrmUserId } from '@/services/profiles';

type TabType = 'unassigned' | 'assigned' | 'my-contacts' | 'my-added';

export default function Contacts() {
  const { user, crmUser, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('my-contacts');
  const [refreshKey, setRefreshKey] = useState(0);
  const [myAddedCount, setMyAddedCount] = useState(0);

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

  useEffect(() => {
    if (!authLoading && crmUser) {
      loadMyAddedCount();
    }
  }, [authLoading, crmUser, loadMyAddedCount]);

  const handleContactAdded = () => {
    // Trigger refresh by updating key
    setRefreshKey(prev => prev + 1);
    loadMyAddedCount();
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
              : 'Manage your assigned contacts by stage'
            }
          </p>
        </div>
        <AddContactModal onSuccess={handleContactAdded} />
      </div>

      {isAdmin ? (
        // Admin view: Three tabs
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TabType)}>
          <TabsList>
            <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
            <TabsTrigger value="assigned">Assigned</TabsTrigger>
            <TabsTrigger value="my-contacts">My Contacts</TabsTrigger>
            <TabsTrigger value="my-added" className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              My Added
              {myAddedCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {myAddedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unassigned" className="mt-4">
            <UnassignedContactsTab key={`unassigned-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="assigned" className="mt-4">
            <AssignedContactsTab key={`assigned-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="my-contacts" className="mt-4">
            <MyContactsTab key={`my-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="my-added" className="mt-4">
            <MyAddedContactsTab key={`added-${refreshKey}`} onRefresh={loadMyAddedCount} />
          </TabsContent>
        </Tabs>
      ) : (
        // Non-admin view: Only My Contacts
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TabType)}>
          <TabsList>
            <TabsTrigger value="my-contacts">My Contacts</TabsTrigger>
            <TabsTrigger value="my-added" className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              My Added
              {myAddedCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {myAddedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-contacts" className="mt-4">
            <MyContactsTab key={`my-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="my-added" className="mt-4">
            <MyAddedContactsTab key={`added-${refreshKey}`} onRefresh={loadMyAddedCount} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
