import { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { Loader2, RefreshCw, Users } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { getUserNames } from "@/services/interactions";
import { fetchAssignedRows } from "@/services/directoryView";
import { DirectoryRow, AssignmentStage } from "@/types/directory";
import { useAuth } from "@/contexts/AuthContext";

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

export function AssignedContactsTab() {
  const { isAdmin } = useAuth();

  const [contacts, setContacts] = useState<DirectoryRow[]>([]);
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: rows, error } = await fetchAssignedRows();
      if (error) {
        console.error("AssignedContactsTab fetch failed:", error);
        setContacts([]);
        return;
      }

      setContacts(rows);

      // Resolve user names
      const allUserIds = new Set<string>();
      rows.forEach((c) => {
        if (c.created_by_crm_user_id) allUserIds.add(c.created_by_crm_user_id);
        if (c.primary_owner_id) allUserIds.add(c.primary_owner_id);
        if (c.secondary_owner_id) allUserIds.add(c.secondary_owner_id);
      });

      if (allUserIds.size > 0) {
        const namesResult = await getUserNames(Array.from(allUserIds));
        if (namesResult.data) setUserNamesMap(namesResult.data);
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
                  <TableHead>Email</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead>Primary Owner</TableHead>
                  <TableHead>Secondary Owner</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.full_name || "—"}</TableCell>

                    <TableCell>{contact.company_name || "—"}</TableCell>

                    <TableCell>{contact.email || "—"}</TableCell>

                    <TableCell>
                      {contact.created_by_crm_user_id ? userNamesMap[contact.created_by_crm_user_id] || "—" : "—"}
                    </TableCell>

                    <TableCell>
                      {contact.primary_owner_id ? userNamesMap[contact.primary_owner_id] || "—" : "Unassigned"}
                    </TableCell>

                    <TableCell>
                      {contact.secondary_owner_id ? userNamesMap[contact.secondary_owner_id] || "—" : "—"}
                    </TableCell>

                    <TableCell>
                      {contact.primary_stage ? (
                        <Badge className={STAGE_COLORS[contact.primary_stage] || ""}>
                          {STAGE_LABELS[contact.primary_stage] || contact.primary_stage}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell>{formatDate(contact.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
