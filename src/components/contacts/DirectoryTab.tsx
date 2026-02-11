import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { Loader2, RefreshCw, BookOpen, Filter, AlertTriangle, User, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabaseClient";
import { getActiveCrmUsers } from "@/services/assignPrimary";
import { getOwnersForContacts, ContactOwners, upsertOwners, changeContactStage } from "@/services/assignments";
import { getCompanyNamesMap } from "@/services/contacts";
import { getUserNames } from "@/services/interactions";
import { SortableHeader, type SortColumn, type SortDirection } from "./ColumnFilters";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmUser } from "@/hooks/useCrmUser";
import { DirectoryBulkToolbar } from "./DirectoryBulkToolbar";
import { ContactEditSheet } from "./ContactEditSheet";
import { useToast } from "@/hooks/use-toast";

type AssignmentStage = "COLD_CALLING" | "ASPIRATION" | "ACHIEVEMENT" | "INACTIVE";

const STAGE_OPTIONS: { value: AssignmentStage; label: string }[] = [
  { value: "COLD_CALLING", label: "Cold Calling" },
  { value: "ASPIRATION", label: "Aspiration" },
  { value: "ACHIEVEMENT", label: "Achievement" },
  { value: "INACTIVE", label: "Inactive" },
];

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

interface DirectoryContact {
  id: string;
  full_name: string | null;
  company_id: string | null;
  created_by_crm_user_id: string | null;
  created_at: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
}

interface DirectoryTabProps {
  onCountsChanged?: () => void;
}

export function DirectoryTab({ onCountsChanged }: DirectoryTabProps = {}) {
  const { isAdmin } = useAuth();
  const { crmUserId } = useCrmUser();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<DirectoryContact[]>([]);
  const [crmUsers, setCrmUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [ownersMap, setOwnersMap] = useState<Record<string, ContactOwners>>({});
  const [companyNamesMap, setCompanyNamesMap] = useState<Record<string, string>>({});
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // filters
  const [nameFilter, setNameFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [addedByFilter, setAddedByFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: "created_at",
    direction: "desc",
  });

  // selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // row saving indicators
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});

  // pin editing row so it doesn't jump
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const editingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (editingTimerRef.current) clearTimeout(editingTimerRef.current);
    };
  }, []);

  const pinEditingRow = (contactId: string) => {
    if (editingTimerRef.current) clearTimeout(editingTimerRef.current);
    setEditingContactId(contactId);
    editingTimerRef.current = setTimeout(() => setEditingContactId(null), 2500);
  };

  const formatCreatedDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return "—";
    }
  };

  // Helper to get primary owner ID from ownersMap
  const getPrimaryOwnerId = (contactId: string): string | null => {
    return ownersMap[contactId]?.primary?.assigned_to_crm_user_id || null;
  };

  // Helper to get stage from ownersMap (contact_assignments is truth)
  const getContactStage = (contactId: string): AssignmentStage | null => {
    return (ownersMap[contactId]?.primary?.stage as AssignmentStage) || null;
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load active CRM users (for dropdown + filters)
      const usersResult = await getActiveCrmUsers();
      if (usersResult.data) {
        setCrmUsers(usersResult.data.map((u) => ({ id: u.id, full_name: u.full_name })));
      }

      // Directory: contacts table (flat, no FK joins)
      const { data, error } = await supabase
        .from("contacts")
        .select("id, full_name, company_id, created_by_crm_user_id, created_at, is_archived, archived_at")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Directory load failed", description: error.message, variant: "destructive" });
        setContacts([]);
        return;
      }

      const contactsList = (data || []) as DirectoryContact[];
      setContacts(contactsList);

      const contactIds = contactsList.map((c) => c.id);

      // Fetch ownership from contact_assignments (source of truth)
      let fetchedOwnersMap: Record<string, ContactOwners> = {};
      if (contactIds.length > 0) {
        const ownersResult = await getOwnersForContacts(contactIds);
        if (ownersResult.data) {
          fetchedOwnersMap = ownersResult.data;
        }
      }
      setOwnersMap(fetchedOwnersMap);

      // Build company names map
      const companyIds = Array.from(new Set(contactsList.map((c) => c.company_id).filter(Boolean))) as string[];
      if (companyIds.length > 0) {
        const namesResult = await getCompanyNamesMap(companyIds);
        if (namesResult.data) {
          setCompanyNamesMap(namesResult.data);
        }
      }

      // Build user names map from created_by + owner IDs
      const allUserIds = new Set<string>();
      contactsList.forEach((c) => {
        if (c.created_by_crm_user_id) allUserIds.add(c.created_by_crm_user_id);
      });
      Object.values(fetchedOwnersMap).forEach((owners) => {
        if (owners.primary?.assigned_to_crm_user_id) allUserIds.add(owners.primary.assigned_to_crm_user_id);
        if (owners.secondary?.assigned_to_crm_user_id) allUserIds.add(owners.secondary.assigned_to_crm_user_id);
      });

      if (allUserIds.size > 0) {
        const namesResult = await getUserNames(Array.from(allUserIds));
        if (namesResult.data) {
          setUserNamesMap(namesResult.data);
        }
      }
    } catch (e: any) {
      toast({ title: "Directory load failed", description: e?.message || "Unexpected error", variant: "destructive" });
      setContacts([]);
    } finally {
      setIsLoading(false);
      onCountsChanged?.();
    }
  }, [toast, onCountsChanged]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stage counts derived from contact_assignments (via ownersMap)
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0, INACTIVE: 0 };
    contacts.forEach((c) => {
      const stage = ownersMap[c.id]?.primary?.stage;
      if (stage && counts[stage] !== undefined) counts[stage]++;
    });
    return counts;
  }, [contacts, ownersMap]);

  // Owner counts derived from contact_assignments (via ownersMap)
  const ownerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach((c) => {
      const k = getPrimaryOwnerId(c.id) || "UNASSIGNED";
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [contacts, ownersMap]);

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    if (nameFilter.trim()) {
      const s = nameFilter.toLowerCase().trim();
      filtered = filtered.filter((c) => (c.full_name || "").toLowerCase().includes(s));
    }

    if (companyFilter.trim()) {
      const s = companyFilter.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const name = c.company_id ? (companyNamesMap[c.company_id] || "") : "";
        return name.toLowerCase().includes(s);
      });
    }

    if (ownerFilter === "unassigned") {
      filtered = filtered.filter((c) => !getPrimaryOwnerId(c.id));
    } else if (ownerFilter !== "all") {
      filtered = filtered.filter((c) => getPrimaryOwnerId(c.id) === ownerFilter);
    }

    if (addedByFilter !== "all") {
      filtered = filtered.filter((c) => c.created_by_crm_user_id === addedByFilter);
    }

    if (stageFilter !== "all") {
      filtered = filtered.filter((c) => (getContactStage(c.id) || "") === stageFilter);
    }

    // Sort: editing row pinned first, then unassigned first, then sort config
    const dir = sortConfig.direction === "asc" ? 1 : -1;

    filtered = [...filtered].sort((a, b) => {
      if (a.id === editingContactId) return -1;
      if (b.id === editingContactId) return 1;

      const aUnassigned = !getPrimaryOwnerId(a.id);
      const bUnassigned = !getPrimaryOwnerId(b.id);
      if (aUnassigned && !bUnassigned) return -1;
      if (!aUnassigned && bUnassigned) return 1;

      let aVal = "";
      let bVal = "";

      switch (sortConfig.column) {
        case "full_name":
          aVal = (a.full_name || "").toLowerCase();
          bVal = (b.full_name || "").toLowerCase();
          break;
        case "company":
          aVal = (a.company_id ? companyNamesMap[a.company_id] || "" : "").toLowerCase();
          bVal = (b.company_id ? companyNamesMap[b.company_id] || "" : "").toLowerCase();
          break;
        case "stage":
          aVal = (getContactStage(a.id) || "").toLowerCase();
          bVal = (getContactStage(b.id) || "").toLowerCase();
          break;
        case "created_at":
        default:
          aVal = a.created_at || "";
          bVal = b.created_at || "";
          break;
      }

      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });

    return filtered;
  }, [contacts, nameFilter, companyFilter, ownerFilter, addedByFilter, stageFilter, sortConfig, editingContactId, companyNamesMap, ownersMap]);

  const handleSort = (column: SortColumn) => {
    setSortConfig((prev) => ({
      column,
      direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // selection helpers
  const visibleIds = filteredContacts.map((c) => c.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(visibleIds);
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkComplete = () => {
    setSelectedIds([]);
    fetchData();
  };

  const isRowSaving = (contactId: string) =>
    !!savingCells[`${contactId}-assign`] || !!savingCells[`${contactId}-stage`];

  // Assignment change → writes to contact_assignments (close-then-insert)
  const handleAssignChange = async (contactId: string, newUserId: string | null) => {
    if (!isAdmin) return;

    const cellKey = `${contactId}-assign`;
    setSavingCells((prev) => ({ ...prev, [cellKey]: true }));
    pinEditingRow(contactId);

    try {
      const now = new Date().toISOString();
      const currentOwners = ownersMap[contactId];
      let currentSecondary = currentOwners?.secondary?.assigned_to_crm_user_id || null;
      const currentStage = (currentOwners?.primary?.stage as AssignmentStage) || "COLD_CALLING";

      if (newUserId === null) {
        // Unassign: close primary assignment only
        const { error } = await supabase
          .from("contact_assignments")
          .update({ status: "CLOSED", ended_at: now })
          .eq("contact_id", contactId)
          .eq("status", "ACTIVE")
          .is("ended_at", null)
          .ilike("assignment_role", "primary");

        if (error) {
          toast({ title: "Assignment failed", description: error.message, variant: "destructive" });
          return;
        }
      } else {
        // If new primary is the current secondary, clear secondary (promote)
        if (currentSecondary === newUserId) {
          currentSecondary = null;
        }

        const result = await upsertOwners({
          contact_id: contactId,
          primary_owner_id: newUserId,
          secondary_owner_id: currentSecondary,
          stage: currentStage,
        });

        if (result.error) {
          toast({ title: "Assignment failed", description: result.error, variant: "destructive" });
          return;
        }
      }

      toast({ title: "Assignment updated" });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Assignment failed", description: e?.message || "Unexpected error", variant: "destructive" });
    } finally {
      setSavingCells((prev) => ({ ...prev, [cellKey]: false }));
    }
  };

  // Stage change → writes to contact_assignments via changeContactStage
  const handleStageChange = async (contactId: string, newStage: AssignmentStage) => {
    if (!isAdmin) return;

    const cellKey = `${contactId}-stage`;
    setSavingCells((prev) => ({ ...prev, [cellKey]: true }));
    pinEditingRow(contactId);

    try {
      const result = await changeContactStage({
        contact_id: contactId,
        to_stage: newStage,
      });

      if (result.error) {
        toast({ title: "Stage update failed", description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: "Stage updated" });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Stage update failed", description: e?.message || "Unexpected error", variant: "destructive" });
    } finally {
      setSavingCells((prev) => ({ ...prev, [cellKey]: false }));
      onCountsChanged?.();
    }
  };

  // Admin Edit/Delete
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);

  const openEditPanel = (contact: DirectoryContact) => {
    setEditContactId(contact.id);
    setEditSheetOpen(true);
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(`⚠️ Delete "${contactName}"?\n\nThis will archive the contact.\n\nContinue?`);
    if (!confirmed) return;

    // Archive the contact
    const { error } = await supabase
      .from("contacts")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("id", contactId);

    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }

    // Close all active assignments for this contact
    await supabase
      .from("contact_assignments")
      .update({ status: "CLOSED", ended_at: new Date().toISOString() })
      .eq("contact_id", contactId)
      .eq("status", "ACTIVE");

    toast({ title: "Contact deleted", description: `"${contactName}" has been archived.` });
    await fetchData();
    onCountsChanged?.();
  };

  const handleEditSuccess = () => {
    fetchData();
    onCountsChanged?.();
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <BookOpen className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Directory</CardTitle>
                <CardDescription>{isLoading ? "Loading..." : `${filteredContacts.length} contacts`}</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Bulk toolbar (admin only, when selected) */}
          {isAdmin && selectedIds.length > 0 && (
            <DirectoryBulkToolbar
              selectedIds={selectedIds}
              onClearSelection={() => setSelectedIds([])}
              onComplete={handleBulkComplete}
            />
          )}

          {/* Owner filter tabs (admin-only) */}
          {isAdmin && !isLoading && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-xs font-medium text-muted-foreground mr-1">Filter by owner:</span>

              <Badge
                variant={ownerFilter === "unassigned" ? "default" : "outline"}
                className={`cursor-pointer text-xs px-2.5 py-1 transition-colors ${
                  ownerFilter === "unassigned"
                    ? "bg-destructive hover:bg-destructive/90"
                    : "border-destructive/30 text-destructive hover:bg-destructive/10"
                }`}
                onClick={() => setOwnerFilter(ownerFilter === "unassigned" ? "all" : "unassigned")}
              >
                ⚠ Unassigned ({ownerCounts["UNASSIGNED"] || 0})
              </Badge>

              {crmUsers.map((u) => {
                const pCount = contacts.filter((c) => getPrimaryOwnerId(c.id) === u.id).length;
                const isActive = ownerFilter === u.id;
                return (
                  <Badge
                    key={u.id}
                    variant={isActive ? "default" : "outline"}
                    className={`cursor-pointer text-xs px-2.5 py-1 transition-colors ${isActive ? "" : "hover:bg-primary/10"}`}
                    onClick={() => setOwnerFilter(isActive ? "all" : u.id)}
                  >
                    {u.full_name} ({pCount})
                  </Badge>
                );
              })}

              {ownerFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => setOwnerFilter("all")}
                >
                  ✕ Reset
                </Button>
              )}
            </div>
          )}

          {/* Header filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Input
              placeholder="Contact name…"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="h-8 w-[160px] text-sm"
            />
            <Input
              placeholder="Company…"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="h-8 w-[150px] text-sm"
            />

            {/* Added By filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={addedByFilter} onValueChange={setAddedByFilter}>
                <SelectTrigger className="h-8 w-[200px] text-sm">
                  <SelectValue placeholder="Added By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Added By: All</SelectItem>
                  {crmUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Non-admin owner filter dropdown */}
            {!isAdmin && (
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="h-8 w-[180px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {crmUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({contacts.filter((c) => getPrimaryOwnerId(c.id) === u.id).length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Stage filter buttons with counts */}
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              <Button
                variant={stageFilter === "all" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setStageFilter("all")}
              >
                All Stages
              </Button>
              {STAGE_OPTIONS.map((s) => (
                <Button
                  key={s.value}
                  variant={stageFilter === s.value ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setStageFilter(s.value)}
                >
                  {s.label} ({stageCounts[s.value] || 0})
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">No contacts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      {isAdmin && (
                        <TableHead className="w-10">
                          <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                        </TableHead>
                      )}
                      <TableHead>
                        <SortableHeader
                          label="Contact Name"
                          column="full_name"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                      </TableHead>
                      <TableHead>
                        <SortableHeader label="Company" column="company" currentSort={sortConfig} onSort={handleSort} />
                      </TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Owner
                        </span>
                      </TableHead>
                      <TableHead>
                        <SortableHeader label="Stage" column="stage" currentSort={sortConfig} onSort={handleSort} />
                      </TableHead>
                      <TableHead>
                        <SortableHeader
                          label="Created"
                          column="created_at"
                          currentSort={sortConfig}
                          onSort={handleSort}
                        />
                      </TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredContacts.map((contact) => {
                      const primaryOwnerId = getPrimaryOwnerId(contact.id) || "";
                      const contactStage = getContactStage(contact.id);
                      const isSelected = selectedIds.includes(contact.id);
                      const hasPrimary = !!primaryOwnerId;
                      const rowSaving = isRowSaving(contact.id);
                      const isEditing = contact.id === editingContactId;

                      return (
                        <TableRow
                          key={contact.id}
                          className={[
                            "border-border hover:bg-muted/50",
                            isSelected ? "bg-primary/5" : "",
                            !hasPrimary ? "bg-destructive/5 border-destructive/20" : "",
                            rowSaving ? "opacity-50 pointer-events-none" : "",
                            isEditing ? "ring-2 ring-primary/40 bg-primary/5" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {isAdmin && (
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleOne(contact.id)}
                                aria-label={`Select ${contact.full_name}`}
                              />
                            </TableCell>
                          )}

                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {!hasPrimary && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                              {contact.full_name || "—"}
                            </div>
                          </TableCell>

                          <TableCell>
                            {contact.company_id && companyNamesMap[contact.company_id] ? (
                              <Badge variant="secondary">{companyNamesMap[contact.company_id]}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Added By */}
                          <TableCell className="text-xs text-muted-foreground">
                            {contact.created_by_crm_user_id ? (userNamesMap[contact.created_by_crm_user_id] || "—") : "—"}
                          </TableCell>

                          {/* Owner (from contact_assignments) */}
                          <TableCell className="text-sm">
                            {isAdmin ? (
                              <select
                                value={primaryOwnerId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleAssignChange(contact.id, val === "" ? null : val);
                                }}
                                disabled={!!savingCells[`${contact.id}-assign`]}
                                className="w-full max-w-[180px] px-2 py-1.5 text-sm border border-input rounded-md bg-background hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">Unassigned</option>
                                {crmUsers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.full_name}
                                  </option>
                                ))}
                              </select>
                            ) : primaryOwnerId ? (
                              <span className="text-sm">{userNamesMap[primaryOwnerId] || "Unknown"}</span>
                            ) : (
                              <span className="text-destructive text-sm font-medium">Unassigned</span>
                            )}
                          </TableCell>

                          {/* Stage (from contact_assignments) */}
                          <TableCell>
                            {isAdmin ? (
                              <Select
                                value={contactStage || "COLD_CALLING"}
                                onValueChange={(val) => handleStageChange(contact.id, val as AssignmentStage)}
                                disabled={!!savingCells[`${contact.id}-stage`]}
                              >
                                <SelectTrigger className="h-7 w-[130px] text-xs border-input focus:ring-primary/50">
                                  <SelectValue>
                                    <Badge className={`${STAGE_COLORS[contactStage || "COLD_CALLING"]} text-xs`}>
                                      {STAGE_LABELS[contactStage || "COLD_CALLING"] || contactStage}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {STAGE_OPTIONS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : contactStage ? (
                              <Badge className={STAGE_COLORS[contactStage] || ""}>
                                {STAGE_LABELS[contactStage] || contactStage}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatCreatedDate(contact.created_at)}
                          </TableCell>

                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                  onClick={() => openEditPanel(contact)}
                                  title="Edit contact"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteContact(contact.id, contact.full_name || "Unknown")}
                                  title="Delete contact"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Contact Sheet (slides from right) */}
      <ContactEditSheet
        contactId={editContactId}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
