import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { Loader2, RefreshCw, BookOpen, Filter, AlertTriangle, User, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabaseClient";
import { getActiveCrmUsers } from "@/services/assignPrimary";
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
  assigned_to_user_id: string | null;
  created_by_crm_user_id: string | null;
  stage: AssignmentStage | null;
  created_at: string | null;

  // joined objects (many-to-one)
  companies?: { company_name: string | null } | null;
  assigned_user?: { full_name: string | null } | null;
  created_by_user?: { full_name: string | null } | null;

  // other fields that may exist in your table but not required here
  designation?: string | null;
  ice_handle?: string | null;
  preferred_channel?: string | null;
  notes?: string | null;
  country?: string | null;

  // archive flags in your schema
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
  const [isLoading, setIsLoading] = useState(true);

  // filters
  const [nameFilter, setNameFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all"); // all | unassigned | userId
  const [addedByFilter, setAddedByFilter] = useState("all"); // all | userId
  const [stageFilter, setStageFilter] = useState("all"); // all | stage

  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: "created_at",
    direction: "desc",
  });

  // selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // row saving indicators
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});

  // pin editing row so it doesn’t jump
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
      // Load active CRM users (for dropdown + filters)
      const usersResult = await getActiveCrmUsers();
      if (usersResult.data) {
        setCrmUsers(usersResult.data.map((u) => ({ id: u.id, full_name: u.full_name })));
      }

      // Directory source of truth: contacts.assigned_to_user_id + joins
      const { data, error } = await supabase
        .from("contacts")
        .select(
          `
          id,
          full_name,
          company_id,
          assigned_to_user_id,
          created_by_crm_user_id,
          stage,
          created_at,
          is_archived,
          archived_at,
          companies:company_id ( company_name ),
          assigned_user:assigned_to_user_id ( full_name ),
          created_by_user:created_by_crm_user_id ( full_name )
        `,
        )
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Directory load failed", description: error.message, variant: "destructive" });
        setContacts([]);
        return;
      }

      setContacts((data || []) as DirectoryContact[]);
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

  // stage counts derived from contacts (always accurate)
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0, INACTIVE: 0 };
    contacts.forEach((c) => {
      if (c.stage && counts[c.stage] !== undefined) counts[c.stage]++;
    });
    return counts;
  }, [contacts]);

  // owner counts derived from assigned_to_user_id (always accurate)
  const ownerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach((c) => {
      const k = c.assigned_to_user_id || "UNASSIGNED";
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    if (nameFilter.trim()) {
      const s = nameFilter.toLowerCase().trim();
      filtered = filtered.filter((c) => (c.full_name || "").toLowerCase().includes(s));
    }

    if (companyFilter.trim()) {
      const s = companyFilter.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const name = c.companies?.company_name || "";
        return name.toLowerCase().includes(s);
      });
    }

    if (ownerFilter === "unassigned") {
      filtered = filtered.filter((c) => !c.assigned_to_user_id);
    } else if (ownerFilter !== "all") {
      filtered = filtered.filter((c) => c.assigned_to_user_id === ownerFilter);
    }

    if (addedByFilter !== "all") {
      filtered = filtered.filter((c) => c.created_by_crm_user_id === addedByFilter);
    }

    if (stageFilter !== "all") {
      filtered = filtered.filter((c) => (c.stage || "") === stageFilter);
    }

    // Sort: editing row pinned first, then unassigned first, then sort config
    const dir = sortConfig.direction === "asc" ? 1 : -1;

    filtered = [...filtered].sort((a, b) => {
      if (a.id === editingContactId) return -1;
      if (b.id === editingContactId) return 1;

      const aUnassigned = !a.assigned_to_user_id;
      const bUnassigned = !b.assigned_to_user_id;
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
          aVal = (a.companies?.company_name || "").toLowerCase();
          bVal = (b.companies?.company_name || "").toLowerCase();
          break;
        case "stage":
          aVal = (a.stage || "").toLowerCase();
          bVal = (b.stage || "").toLowerCase();
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
  }, [contacts, nameFilter, companyFilter, ownerFilter, addedByFilter, stageFilter, sortConfig, editingContactId]);

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

  // assignment change -> contacts.assigned_to_user_id
  const handleAssignChange = async (contactId: string, newUserId: string | null) => {
    if (!isAdmin) return;

    const cellKey = `${contactId}-assign`;
    setSavingCells((prev) => ({ ...prev, [cellKey]: true }));
    pinEditingRow(contactId);

    try {
      const { data, error } = await supabase
        .from("contacts")
        .update({ assigned_to_user_id: newUserId })
        .eq("id", contactId)
        .select("id")
        .maybeSingle();

      if (error) {
        toast({ title: "Assignment failed", description: error.message, variant: "destructive" });
        return;
      }

      if (!data) {
        toast({ title: "No change applied", description: "0 rows updated", variant: "default" });
        return;
      }

      toast({ title: "Assignment updated", description: "Assignment updated", variant: "default" });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Assignment failed", description: e?.message || "Unexpected error", variant: "destructive" });
    } finally {
      setSavingCells((prev) => ({ ...prev, [cellKey]: false }));
    }
  };

  // stage change -> contacts.stage
  const handleStageChange = async (contactId: string, newStage: AssignmentStage) => {
    if (!isAdmin) return;

    const cellKey = `${contactId}-stage`;
    setSavingCells((prev) => ({ ...prev, [cellKey]: true }));
    pinEditingRow(contactId);

    try {
      const { data, error } = await supabase
        .from("contacts")
        .update({ stage: newStage })
        .eq("id", contactId)
        .select("id")
        .maybeSingle();

      if (error) {
        toast({ title: "Stage update failed", description: error.message, variant: "destructive" });
        return;
      }

      if (!data) {
        toast({ title: "No change applied", description: "0 rows updated", variant: "default" });
        return;
      }

      toast({ title: "Stage updated", description: "Stage updated", variant: "default" });
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

    const { error } = await supabase
      .from("contacts")
      .update({ is_archived: true, archived_at: new Date().toISOString() })
      .eq("id", contactId);

    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }

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
                    ? "bg-red-600 hover:bg-red-700"
                    : "border-red-300 text-red-600 hover:bg-red-50"
                }`}
                onClick={() => setOwnerFilter(ownerFilter === "unassigned" ? "all" : "unassigned")}
              >
                ⚠ Unassigned ({ownerCounts["UNASSIGNED"] || 0})
              </Badge>

              {crmUsers.map((u) => {
                const pCount = contacts.filter((c) => c.assigned_to_user_id === u.id).length;
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
                        {u.full_name} ({contacts.filter((c) => c.assigned_to_user_id === u.id).length})
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
                    <TableRow className="border-gray-200">
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
                      const primaryOwnerId = contact.assigned_to_user_id || "";
                      const isSelected = selectedIds.includes(contact.id);
                      const hasPrimary = !!primaryOwnerId;
                      const rowSaving = isRowSaving(contact.id);
                      const isEditing = contact.id === editingContactId;

                      return (
                        <TableRow
                          key={contact.id}
                          className={[
                            "border-gray-200 hover:bg-gray-50",
                            isSelected ? "bg-primary/5" : "",
                            !hasPrimary ? "bg-red-50 border-red-200" : "",
                            rowSaving ? "opacity-50 pointer-events-none" : "",
                            isEditing ? "ring-2 ring-blue-400 bg-blue-50/30" : "",
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
                              {!hasPrimary && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                              {contact.full_name || "—"}
                            </div>
                          </TableCell>

                          <TableCell>
                            {contact.companies?.company_name ? (
                              <Badge variant="secondary">{contact.companies.company_name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Added By */}
                          <TableCell className="text-xs text-muted-foreground">
                            {contact.created_by_user?.full_name || "—"}
                          </TableCell>

                          {/* Owner */}
                          <TableCell className="text-sm">
                            {isAdmin ? (
                              <select
                                value={primaryOwnerId}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  handleAssignChange(contact.id, val === "" ? null : val);
                                }}
                                disabled={!!savingCells[`${contact.id}-assign`]}
                                className="w-full max-w-[180px] px-2 py-1.5 text-sm border border-input rounded-md bg-background hover:border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">Unassigned</option>
                                {crmUsers.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.full_name}
                                  </option>
                                ))}
                              </select>
                            ) : primaryOwnerId ? (
                              <span className="text-sm">{contact.assigned_user?.full_name || "Unknown"}</span>
                            ) : (
                              <span className="text-red-500 text-sm font-medium">Unassigned</span>
                            )}
                          </TableCell>

                          {/* Stage */}
                          <TableCell>
                            {isAdmin ? (
                              <Select
                                value={contact.stage || "COLD_CALLING"}
                                onValueChange={(val) => handleStageChange(contact.id, val as AssignmentStage)}
                                disabled={!!savingCells[`${contact.id}-stage`]}
                              >
                                <SelectTrigger className="h-7 w-[130px] text-xs border-gray-300 focus:ring-blue-500">
                                  <SelectValue>
                                    <Badge className={`${STAGE_COLORS[contact.stage || "COLD_CALLING"]} text-xs`}>
                                      {STAGE_LABELS[contact.stage || "COLD_CALLING"] || contact.stage}
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
                            ) : contact.stage ? (
                              <Badge className={STAGE_COLORS[contact.stage] || ""}>
                                {STAGE_LABELS[contact.stage] || contact.stage}
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
