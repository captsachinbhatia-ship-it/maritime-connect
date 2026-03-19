import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { Loader2, RefreshCw, BookOpen, Filter, AlertTriangle, User, Users2, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabaseClient";
import { getActiveCrmUsers } from "@/services/assignPrimary";
import { upsertOwners, addAssignment, changeContactStage } from "@/services/assignments";
import { getUserNames } from "@/services/interactions";
import { fetchDirectoryRows } from "@/services/directoryView";
import { DirectoryRow, AssignmentStage } from "@/types/directory";
import { SortableHeader, type SortColumn, type SortDirection } from "./ColumnFilters";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { DirectoryBulkToolbar } from "./DirectoryBulkToolbar";
import { ContactEditSheet } from "./ContactEditSheet";
import { OwnerSummaryTable, OwnerFilterState } from "./OwnerSummaryTable";
import { useToast } from "@/hooks/use-toast";

const STAGE_OPTIONS: { value: AssignmentStage; label: string }[] = [
  { value: "COLD_CALLING", label: "Cold Calling" },
  { value: "TARGETING", label: "Targeting" },
  { value: "ASPIRATION", label: "Aspiration" },
  { value: "ACHIEVEMENT", label: "Achievement" },
];

const STAGE_LABELS: Record<string, string> = {
  COLD_CALLING: "Cold Calling",
  TARGETING: "Targeting",
  ASPIRATION: "Aspiration",
  ACHIEVEMENT: "Achievement",
};

const STAGE_COLORS: Record<string, string> = {
  COLD_CALLING: "bg-blue-100 text-blue-800",
  TARGETING: "bg-orange-100 text-orange-800",
  ASPIRATION: "bg-amber-100 text-amber-800",
  ACHIEVEMENT: "bg-green-100 text-green-800",
};

interface DirectoryTabProps {
  onCountsChanged?: () => void;
}

export function DirectoryTab({ onCountsChanged }: DirectoryTabProps = {}) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<DirectoryRow[]>([]);
  const [crmUsers, setCrmUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // filters
  const [nameFilter, setNameFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [ownerSummaryFilter, setOwnerSummaryFilter] = useState<OwnerFilterState | null>(null);
  const [addedByFilter, setAddedByFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");

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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersResult = await getActiveCrmUsers();
      if (usersResult.data) {
        setCrmUsers(usersResult.data.map((u) => ({ id: u.id, full_name: u.full_name })));
      }

      const { data: rows, error } = await fetchDirectoryRows();
      if (error) {
        toast({ title: "Directory load failed", description: error, variant: "destructive" });
        setContacts([]);
        return;
      }

      setContacts(rows);

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

  // Stage counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { COLD_CALLING: 0, TARGETING: 0, ASPIRATION: 0, ACHIEVEMENT: 0 };
    contacts.forEach((c) => {
      if (c.primary_stage && counts[c.primary_stage] !== undefined) counts[c.primary_stage]++;
    });
    return counts;
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((c) => c.is_active !== false);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter((c) => c.is_active === false);
    }

    // Owner summary table filter
    if (ownerSummaryFilter) {
      if (ownerSummaryFilter.type === "unassigned") {
        filtered = filtered.filter((c) => c.is_unassigned || !c.primary_owner_id);
      } else if (ownerSummaryFilter.type === "primary" && ownerSummaryFilter.userId) {
        filtered = filtered.filter((c) => c.primary_owner_id === ownerSummaryFilter.userId);
      } else if (ownerSummaryFilter.type === "secondary" && ownerSummaryFilter.userId) {
        filtered = filtered.filter((c) => c.secondary_owner_id === ownerSummaryFilter.userId);
      }
    }

    // Added By
    if (addedByFilter !== "all") {
      filtered = filtered.filter((c) => c.created_by_crm_user_id === addedByFilter);
    }

    // Stage
    if (stageFilter !== "all") {
      filtered = filtered.filter((c) => (c.primary_stage || "") === stageFilter);
    }

    // Search (name, email, company)
    if (nameFilter.trim()) {
      const s = nameFilter.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          (c.full_name || "").toLowerCase().includes(s) ||
          (c.email || "").toLowerCase().includes(s) ||
          (c.company_name || "").toLowerCase().includes(s)
      );
    }

    // Sort
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    filtered = [...filtered].sort((a, b) => {
      if (a.id === editingContactId) return -1;
      if (b.id === editingContactId) return 1;

      const aUnassigned = !a.primary_owner_id;
      const bUnassigned = !b.primary_owner_id;
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
          aVal = (a.company_name || "").toLowerCase();
          bVal = (b.company_name || "").toLowerCase();
          break;
        case "stage":
          aVal = (a.primary_stage || "").toLowerCase();
          bVal = (b.primary_stage || "").toLowerCase();
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
  }, [contacts, nameFilter, ownerSummaryFilter, addedByFilter, stageFilter, statusFilter, sortConfig, editingContactId]);

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
    !!savingCells[`${contactId}-primary`] || !!savingCells[`${contactId}-secondary`] || !!savingCells[`${contactId}-stage`];

  // Primary assignment change
  const handlePrimaryChange = async (contactId: string, newUserId: string | null) => {
    if (!isAdmin) return;
    const cellKey = `${contactId}-primary`;
    setSavingCells((prev) => ({ ...prev, [cellKey]: true }));
    pinEditingRow(contactId);

    try {
      const now = new Date().toISOString();
      const contact = contacts.find((c) => c.id === contactId);
      let currentSecondary = contact?.secondary_owner_id || null;
      const currentStage = contact?.primary_stage || "ASPIRATION";

      if (newUserId === null) {
        const { error } = await supabase
          .from("contact_assignments")
          .update({ status: "CLOSED", ended_at: now })
          .eq("contact_id", contactId)
          .eq("status", "ACTIVE")
          .eq("assignment_role", "PRIMARY");

        if (error) {
          toast({ title: "Assignment failed", description: error.message, variant: "destructive" });
          return;
        }
      } else {
        if (currentSecondary === newUserId) currentSecondary = null;
        const result = await upsertOwners({
          contact_id: contactId,
          primary_owner_id: newUserId,
          secondary_owner_id: currentSecondary,
          stage: currentStage as AssignmentStage,
        });
        if (result.error) {
          toast({ title: "Assignment failed", description: result.error, variant: "destructive" });
          return;
        }
      }

      toast({ title: "Primary owner updated" });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Assignment failed", description: e?.message || "Unexpected error", variant: "destructive" });
    } finally {
      setSavingCells((prev) => ({ ...prev, [cellKey]: false }));
    }
  };

  // Secondary assignment change
  const handleSecondaryChange = async (contactId: string, newUserId: string | null) => {
    if (!isAdmin) return;
    const cellKey = `${contactId}-secondary`;
    setSavingCells((prev) => ({ ...prev, [cellKey]: true }));
    pinEditingRow(contactId);

    try {
      const now = new Date().toISOString();

      if (newUserId === null) {
        // Unassign secondary
        const { error } = await supabase
          .from("contact_assignments")
          .update({ status: "CLOSED", ended_at: now })
          .eq("contact_id", contactId)
          .eq("status", "ACTIVE")
          .eq("assignment_role", "SECONDARY");

        if (error) {
          toast({ title: "Unassign failed", description: error.message, variant: "destructive" });
          return;
        }
      } else {
        const contact = contacts.find((c) => c.id === contactId);
        const stage = (contact?.primary_stage || "COLD_CALLING") as AssignmentStage;
        const result = await addAssignment({
          contact_id: contactId,
          assigned_to_crm_user_id: newUserId,
          assignment_role: "secondary",
          stage,
        });
        if (result.error) {
          toast({ title: "Assignment failed", description: result.error, variant: "destructive" });
          return;
        }
      }

      toast({ title: "Secondary owner updated" });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Assignment failed", description: e?.message || "Unexpected error", variant: "destructive" });
    } finally {
      setSavingCells((prev) => ({ ...prev, [cellKey]: false }));
    }
  };

  // Stage change
  const handleStageChange = async (contactId: string, newStage: AssignmentStage) => {
    if (!isAdmin) return;
    const cellKey = `${contactId}-stage`;
    setSavingCells((prev) => ({ ...prev, [cellKey]: true }));
    pinEditingRow(contactId);

    try {
      const result = await changeContactStage({ contact_id: contactId, to_stage: newStage });
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

  // Edit/Delete
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);

  const openEditPanel = (contact: DirectoryRow) => {
    setEditContactId(contact.id);
    setEditSheetOpen(true);
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`⚠️ Delete "${contactName}"?\n\nThis will archive the contact.\n\nContinue?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("contacts")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("id", contactId);

    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }

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
      {/* Owner Summary Table */}
      {isAdmin && !isLoading && contacts.length > 0 && (
        <OwnerSummaryTable
          activeFilter={ownerSummaryFilter}
          onFilterChange={setOwnerSummaryFilter}
        />
      )}

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
          {isAdmin && selectedIds.length > 0 && (
            <DirectoryBulkToolbar
              selectedIds={selectedIds}
              onClearSelection={() => setSelectedIds([])}
              onComplete={handleBulkComplete}
            />
          )}

          {/* Clean filters row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Input
              placeholder="Search name, email, company…"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="h-8 w-[220px] text-sm"
            />

            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={addedByFilter} onValueChange={setAddedByFilter}>
                <SelectTrigger className="h-8 w-[170px] text-sm">
                  <SelectValue placeholder="Added By" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Added By: All</SelectItem>
                  {crmUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
              <SelectTrigger className="h-8 w-[110px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

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
                        <SortableHeader label="Name" column="full_name" currentSort={sortConfig} onSort={handleSort} />
                      </TableHead>
                      <TableHead>
                        <SortableHeader label="Company" column="company" currentSort={sortConfig} onSort={handleSort} />
                      </TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Primary
                        </span>
                      </TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1">
                          <Users2 className="h-3.5 w-3.5" />
                          Secondary
                        </span>
                      </TableHead>
                      <TableHead>
                        <SortableHeader label="Stage" column="stage" currentSort={sortConfig} onSort={handleSort} />
                      </TableHead>
                      <TableHead>
                        <SortableHeader label="Created" column="created_at" currentSort={sortConfig} onSort={handleSort} />
                      </TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredContacts.map((contact) => {
                      const primaryOwnerId = contact.primary_owner_id || "";
                      const secondaryOwnerId = contact.secondary_owner_id || "";
                      const contactStage = contact.primary_stage;
                      const isSelected = selectedIds.includes(contact.id);
                      const hasPrimary = !!contact.primary_owner_id;
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
                          ].filter(Boolean).join(" ")}
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
                            {contact.company_name ? (
                              <Badge variant="secondary">{contact.company_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {contact.created_by_crm_user_id ? userNamesMap[contact.created_by_crm_user_id] || "—" : "—"}
                          </TableCell>

                          {/* Primary Owner dropdown */}
                          <TableCell className="text-sm">
                            {isAdmin ? (
                              <select
                                value={primaryOwnerId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handlePrimaryChange(contact.id, val === "" ? null : val);
                                }}
                                disabled={!!savingCells[`${contact.id}-primary`]}
                                className="w-full max-w-[150px] px-2 py-1.5 text-xs border border-input rounded-md bg-background hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">Unassign Primary</option>
                                {crmUsers.map((u) => (
                                  <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))}
                              </select>
                            ) : primaryOwnerId ? (
                              <span className="text-sm">{userNamesMap[primaryOwnerId] || "Unknown"}</span>
                            ) : (
                              <span className="text-destructive text-sm font-medium">Unassigned</span>
                            )}
                          </TableCell>

                          {/* Secondary Owner dropdown */}
                          <TableCell className="text-sm">
                            {isAdmin ? (
                              <select
                                value={secondaryOwnerId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleSecondaryChange(contact.id, val === "" ? null : val);
                                }}
                                disabled={!!savingCells[`${contact.id}-secondary`]}
                                className="w-full max-w-[150px] px-2 py-1.5 text-xs border border-input rounded-md bg-background hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">Unassign Secondary</option>
                                {crmUsers.filter((u) => u.id !== primaryOwnerId).map((u) => (
                                  <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))}
                              </select>
                            ) : secondaryOwnerId ? (
                              <span className="text-sm">{userNamesMap[secondaryOwnerId] || "Unknown"}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {isAdmin ? (
                              <Select
                                value={contactStage || "ASPIRATION"}
                                onValueChange={(val) => handleStageChange(contact.id, val as AssignmentStage)}
                                disabled={!!savingCells[`${contact.id}-stage`]}
                              >
                                <SelectTrigger className="h-7 w-[120px] text-xs border-input focus:ring-primary/50">
                                  <SelectValue>
                                    <Badge className={`${STAGE_COLORS[contactStage || "ASPIRATION"]} text-xs`}>
                                      {STAGE_LABELS[contactStage || "ASPIRATION"] || contactStage}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-popover z-50">
                                  {STAGE_OPTIONS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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

      <ContactEditSheet
        contactId={editContactId}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
