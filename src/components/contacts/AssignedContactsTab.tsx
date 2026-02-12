import { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Loader2, RefreshCw, Users } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { supabase } from "@/lib/supabaseClient";
import { getOwnersForContacts, ContactOwners } from "@/services/assignments";
import { getUserNames } from "@/services/interactions";
import { getCompanyNamesMap } from "@/services/contacts";
import { useAuth } from "@/contexts/AuthContext";

type AssignmentStage = "COLD_CALLING" | "ASPIRATION" | "ACHIEVEMENT" | "INACTIVE";

const STAGE_LABELS: Record<string, string> = {
  COLD_CALLING: "Cold Calling",
  ASPIRATION: "Aspiration",
  ACHIEVEMENT: "Achievement",
  INACTIVE: "Inactive",
};

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: "bg-blue-100 text-blue-800",
  ASPIRATION: "bg-amber-100 text-amber-800",
  ACHIEVEMENT: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
};

interface AssignedContact {
  id: string;
  full_name: string | null;
  company_id: string | null;
  email: string | null;
  primary_phone: string | null;
  created_at: string | null;
  created_by_crm_user_id: string | null;
  is_active?: boolean | null;
  stage?: AssignmentStage | null;
}

export function AssignedContactsTab() {
  const { isAdmin } = useAuth();

  const [contacts, setContacts] = useState<AssignedContact[]>([]);
  const [ownersMap, setOwnersMap] = useState<Record<string, ContactOwners>>({});
  const [ownerNamesMap, setOwnerNamesMap] = useState<Record<string, string>>({});
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1️⃣ Get ACTIVE PRIMARY assignments only (STRICT UPPERCASE)
      const { data: primaryAssignments, error: assignmentError } = await supabase
        .from("contact_assignments")
        .select("contact_id, stage")
        .eq("status", "ACTIVE")
        .eq("assignment_role", "PRIMARY");

      if (assignmentError) {
        console.error("Assignment fetch failed:", assignmentError);
        setContacts([]);
        return;
      }

      const contactIds = (primaryAssignments || []).map((a) => a.contact_id);

      if (contactIds.length === 0) {
        setContacts([]);
        return;
      }

      const stageMap: Record<string, AssignmentStage> = {};
      primaryAssignments?.forEach((a: any) => {
        stageMap[a.contact_id] = a.stage;
      });

      // 2️⃣ Fetch contacts from SAFE VIEW
      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts_with_primary_phone")
        .select("*")
        .in("id", contactIds)
        .order("full_name", { ascending: true });

      if (contactsError) {
        console.error("Contact fetch failed:", contactsError);
        setContacts([]);
        return;
      }

      const enrichedContacts: AssignedContact[] =
        (contactsData || []).map((c: any) => ({
          ...c,
          stage: stageMap[c.id] || null,
        })) || [];

      setContacts(enrichedContacts);

      // 3️⃣ Fetch owners map (PRIMARY + SECONDARY)
      const ownersResult = await getOwnersForContacts(contactIds);
      if (ownersResult.data) {
        setOwnersMap(ownersResult.data);

        const userIds = new Set<string>();

        Object.values(ownersResult.data).forEach((o) => {
          if (o.primary?.assigned_to_crm_user_id) userIds.add(o.primary.assigned_to_crm_user_id);
          if (o.secondary?.assigned_to_crm_user_id) userIds.add(o.secondary.assigned_to_crm_user_id);
        });

        enrichedContacts.forEach((c) => {
          if (c.created_by_crm_user_id) userIds.add(c.created_by_crm_user_id);
        });

        if (userIds.size > 0) {
          const namesResult = await getUserNames(Array.from(userIds));
          if (namesResult.data) setOwnerNamesMap(namesResult.data);
        }
      }

      // 4️⃣ Fetch company names
      const companyIds = Array.from(new Set(enrichedContacts.map((c) => c.company_id).filter(Boolean))) as string[];

      if (companyIds.length > 0) {
        const namesResult = await getCompanyNamesMap(companyIds);
        if (namesResult.data) setCompanyNamesMap(namesResult.data);
      }
    } catch (err) {
      console.error("AssignedContactsTab fetch failed:", err);
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    if (statusFilter === "active") {
      filtered = filtered.filter((c) => c.is_active !== false);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((c) => c.is_active === false);
    }

    return filtered;
  }, [contacts, statusFilter]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return "—";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Users className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Assigned Contacts</CardTitle>
              <CardDescription>{isLoading ? "Loading..." : `${filteredContacts.length} contacts`}</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
              <SelectTrigger className="h-8 w-[120px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="mb-2 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">No assigned contacts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Primary Owner</TableHead>
                  <TableHead>Secondary Owner</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredContacts.map((contact) => {
                  const owners = ownersMap[contact.id];
                  const primaryOwnerId = owners?.primary?.assigned_to_crm_user_id;
                  const secondaryOwnerId = owners?.secondary?.assigned_to_crm_user_id;

                  return (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.full_name || "—"}</TableCell>

                      <TableCell>{contact.company_id ? companyNamesMap[contact.company_id] || "—" : "—"}</TableCell>

                      <TableCell>{contact.primary_phone || "—"}</TableCell>

                      <TableCell>{contact.email || "—"}</TableCell>

                      <TableCell>
                        {contact.created_by_crm_user_id ? ownerNamesMap[contact.created_by_crm_user_id] || "—" : "—"}
                      </TableCell>

                      <TableCell>{primaryOwnerId ? ownerNamesMap[primaryOwnerId] || "—" : "Unassigned"}</TableCell>

                      <TableCell>{secondaryOwnerId ? ownerNamesMap[secondaryOwnerId] || "—" : "—"}</TableCell>

                      <TableCell>
                        {contact.stage ? (
                          <Badge className={STAGE_COLORS[contact.stage] || ""}>
                            {STAGE_LABELS[contact.stage] || contact.stage}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell>{formatDate(contact.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
