import { useEffect, useState } from "react";
import { Download, Loader2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getActiveCrmUsers } from "@/services/assignPrimary";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useCrmUser } from "@/hooks/useCrmUser";

type AssignmentStage = "COLD_CALLING" | "TARGETING" | "ASPIRATION" | "ACHIEVEMENT";

interface DirectoryBulkToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onComplete: () => void;
}

const STAGES: { value: AssignmentStage; label: string }[] = [
  { value: "COLD_CALLING", label: "Cold Calling" },
  { value: "TARGETING", label: "Targeting" },
  { value: "ASPIRATION", label: "Aspiration" },
  { value: "ACHIEVEMENT", label: "Achievement" },
];

export function DirectoryBulkToolbar({ selectedIds, onClearSelection, onComplete }: DirectoryBulkToolbarProps) {
  const { toast } = useToast();
  const { crmUserId } = useCrmUser();

  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");
  const [bulkStage, setBulkStage] = useState<string>("");
  const [isApplying, setIsApplying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    getActiveCrmUsers().then((r) => {
      if (r.data) {
        setUsers(r.data.map((u: any) => ({ id: u.id, full_name: u.full_name })));
      }
    });
  }, []);

  const count = selectedIds.length;
  const hasAnyAction = !!assigneeUserId || !!bulkStage;

  const handleApply = async () => {
    if (!hasAnyAction || count === 0 || !crmUserId) return;

    setIsApplying(true);
    const now = new Date().toISOString();

    try {
      if (assigneeUserId) {
        // Get existing primary stages to preserve them
        const { data: existingAssignments } = await supabase
          .from("contact_assignments")
          .select("contact_id, stage")
          .in("contact_id", selectedIds)
          .eq("status", "ACTIVE")
          .is("ended_at", null)
          .ilike("assignment_role", "primary");

        const stageMap: Record<string, string> = {};
        (existingAssignments || []).forEach((a: any) => {
          stageMap[a.contact_id] = a.stage;
        });

        // Close existing primary assignments
        await supabase
          .from("contact_assignments")
          .update({ status: "CLOSED", ended_at: now })
          .in("contact_id", selectedIds)
          .eq("status", "ACTIVE")
          .is("ended_at", null)
          .ilike("assignment_role", "primary");

        // Insert new primary assignments with preserved or overridden stage
        const payloads = selectedIds.map((id) => ({
          contact_id: id,
          assigned_to_crm_user_id: assigneeUserId,
          assigned_by_crm_user_id: crmUserId,
          assignment_role: "primary",
          stage: bulkStage || stageMap[id] || "COLD_CALLING",
          status: "ACTIVE",
          assigned_at: now,
          stage_changed_at: now,
        }));

        const { error } = await supabase.from("contact_assignments").insert(payloads);
        if (error) throw error;
      } else if (bulkStage) {
        // Only stage change (no new assignee) → update existing active primary assignments
        const { error } = await supabase
          .from("contact_assignments")
          .update({
            stage: bulkStage,
            stage_changed_at: now,
          })
          .in("contact_id", selectedIds)
          .eq("status", "ACTIVE")
          .is("ended_at", null)
          .ilike("assignment_role", "primary");

        if (error) throw error;
      }

      toast({
        title: "Bulk update complete",
        description: `Updated ${count} contacts`,
        variant: "default",
      });

      setAssigneeUserId("");
      setBulkStage("");
      onClearSelection();

      // CRITICAL: parent Directory must refetch and recompute counts
      onComplete();
    } catch (e: any) {
      toast({
        title: "Bulk update failed",
        description: e?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleExportCsv = async () => {
    if (count === 0) return;
    setIsExporting(true);

    try {
      // Fetch contacts with joined data for the selected IDs (batch of 50 max per Supabase)
      const batches: any[][] = [];
      for (let i = 0; i < selectedIds.length; i += 50) {
        const batch = selectedIds.slice(i, i + 50);
        const { data } = await supabase
          .from("v_directory_contacts")
          .select("id, full_name, email, company_name, primary_stage, primary_owner_id")
          .in("id", batch);
        if (data) batches.push(data);
      }
      const rows = batches.flat();

      // Resolve owner names
      const ownerIds = [...new Set(rows.map((r) => r.primary_owner_id).filter(Boolean))];
      const ownerNameMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: ownerData } = await supabase
          .from("crm_users")
          .select("id, full_name")
          .in("id", ownerIds);
        (ownerData || []).forEach((u: any) => {
          ownerNameMap[u.id] = u.full_name;
        });
      }

      // Fetch primary phone numbers
      const phoneMap: Record<string, string> = {};
      for (let i = 0; i < selectedIds.length; i += 50) {
        const batch = selectedIds.slice(i, i + 50);
        const { data: phones } = await supabase
          .from("contact_phones")
          .select("contact_id, phone_number")
          .in("contact_id", batch)
          .eq("is_primary", true);
        (phones || []).forEach((p: any) => {
          phoneMap[p.contact_id] = p.phone_number;
        });
      }

      // Build CSV
      const header = ["Full Name", "Email", "Phone", "Company", "Stage", "Assigned Broker"];
      const csvRows = rows.map((r) => [
        r.full_name || "",
        r.email || "",
        phoneMap[r.id] || "",
        r.company_name || "",
        (r.primary_stage || "").replace(/_/g, " "),
        r.primary_owner_id ? ownerNameMap[r.primary_owner_id] || "" : "",
      ]);

      const escapeCsv = (val: string) => {
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const csv = [header, ...csvRows].map((row) => row.map(escapeCsv).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export complete", description: `${rows.length} contacts exported to CSV` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message || "Unexpected error", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 mb-3">
      <div className="flex items-center gap-2 mr-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{count} selected</span>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Assign Owner</Label>
        <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue placeholder="— No change —" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Stage</Label>
        <Select value={bulkStage} onValueChange={setBulkStage}>
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue placeholder="— No change —" />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button size="sm" className="h-8" disabled={!hasAnyAction || isApplying} onClick={handleApply}>
        {isApplying ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Applying…
          </>
        ) : (
          "Apply"
        )}
      </Button>

      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportCsv} disabled={isExporting || isApplying}>
        {isExporting ? (
          <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Exporting…</>
        ) : (
          <><Download className="mr-1 h-3 w-3" />Export CSV</>
        )}
      </Button>

      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearSelection} disabled={isApplying}>
        <X className="mr-1 h-3 w-3" />
        Clear
      </Button>
    </div>
  );
}
