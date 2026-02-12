import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AddContactModal } from "@/components/contacts/AddContactModal";
import { DirectoryTab } from "@/components/contacts/DirectoryTab";
import { MyContactsTab } from "@/components/contacts/MyContactsTab";
import { MyAddedContactsTab } from "@/components/contacts/MyAddedContactsTab";
import { SecondaryContactsTab } from "@/components/contacts/SecondaryContactsTab";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, BookOpen, User, Users2, UserPlus, FileUp } from "lucide-react";

type TabType = "directory" | "my-primary" | "my-secondary" | "my-added";

const ALL_TABS: TabType[] = ["directory", "my-primary", "my-secondary", "my-added"];

export default function Contacts() {
  const { user, crmUser, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tabParam = searchParams.get("tab");
    // Redirect old tab names
    if (tabParam === "unassigned" || tabParam === "my-contacts") return "my-primary";
    if (tabParam === "secondary") return "my-secondary";
    if (tabParam && ALL_TABS.includes(tabParam as TabType)) return tabParam as TabType;
    return "directory";
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Counts from unified view
  const [directoryCount, setDirectoryCount] = useState(0);
  const [myPrimaryCount, setMyPrimaryCount] = useState(0);
  const [mySecondaryCount, setMySecondaryCount] = useState(0);
  const [myAddedCount, setMyAddedCount] = useState(0);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "unassigned" || tabParam === "my-contacts") {
      setActiveTab("my-primary");
      setSearchParams({ tab: "my-primary" }, { replace: true });
      return;
    }
    if (tabParam === "secondary") {
      setActiveTab("my-secondary");
      setSearchParams({ tab: "my-secondary" }, { replace: true });
      return;
    }
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
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      const hasAdminAccess = data?.role === "ADMIN" || data?.role === "CEO";
      setIsAdmin(hasAdminAccess);
    };

    if (!authLoading && crmUser) {
      checkRole();
    } else if (!authLoading) {
      setIsAdmin(false);
    }
  }, [user, crmUser, authLoading]);

  // Fetch counts from unified view
  const loadCounts = useCallback(async () => {
    if (!crmUser?.id) return;
    const currentCrmUserId = crmUser.id;

    try {
      // Directory (global safe)
      const { count: dirCount } = await supabase
        .from("v_directory_contacts_ro")
        .select("contact_id", { count: "exact", head: true });

      // My Primary (scoped)
      const { count: primaryCount } = await supabase
        .from("v_my_primary_contacts")
        .select("contact_id", { count: "exact", head: true });

      // My Secondary (scoped)
      const { count: secondaryCount } = await supabase
        .from("v_my_secondary_contacts")
        .select("contact_id", { count: "exact", head: true });

      // My Added (creator-owned)
      const { count: addedCount } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("created_by_crm_user_id", currentCrmUserId)
        .eq("is_deleted", false);

      setDirectoryCount(dirCount ?? 0);
      setMyPrimaryCount(primaryCount ?? 0);
      setMySecondaryCount(secondaryCount ?? 0);
      setMyAddedCount(addedCount ?? 0);
    } catch {
      // silent
    }
  }, [crmUser]);

  useEffect(() => {
    if (!authLoading && crmUser) {
      loadCounts();
    }
  }, [authLoading, crmUser, loadCounts]);

  const handleContactAdded = () => {
    setRefreshKey((prev) => prev + 1);
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
            {isAdmin ? "Manage contact assignments and ownership" : "View contacts and manage your assigned pipeline"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/contacts/bulk-import")}>
            <FileUp className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <AddContactModal onSuccess={handleContactAdded} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="inline-flex h-10 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground">
          <TabsTrigger
            value="directory"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Directory ({directoryCount})
          </TabsTrigger>
          <TabsTrigger
            value="my-primary"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <User className="h-3.5 w-3.5" />
            My Primary ({myPrimaryCount})
          </TabsTrigger>
          <TabsTrigger
            value="my-secondary"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Users2 className="h-3.5 w-3.5" />
            My Secondary ({mySecondaryCount})
          </TabsTrigger>
          <TabsTrigger
            value="my-added"
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            My Added ({myAddedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-4">
          <DirectoryTab key={`directory-${refreshKey}`} onCountsChanged={loadCounts} />
        </TabsContent>

        <TabsContent value="my-primary" className="mt-4">
          <MyContactsTab key={`mycontacts-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="my-secondary" className="mt-4">
          <SecondaryContactsTab key={`secondary-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="my-added" className="mt-4">
          <MyAddedContactsTab key={`added-${refreshKey}`} onRefresh={loadCounts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
