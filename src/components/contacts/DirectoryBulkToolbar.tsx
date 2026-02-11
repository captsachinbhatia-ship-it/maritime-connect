import { useEffect, useState } from "react";
import { Loader2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getActiveCrmUsers } from "@/services/assignPrimary";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

type AssignmentStage = "COLD_CALLING" | "ASPIRATION" | "ACHIEVEMENT" | "INACTIVE";

interface DirectoryBulkToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onComplete: () => void;
}

const STAGES: { value: AssignmentStage; label: string }[] = [
  { value: "COLD_CALLING", label: "Cold Calling" },
  { value: "ASPIRATION", label: "Aspiration" },
  { value: "ACHIEVEMENT", label: "Achievement" },
  { value: "INACTIVE", label: "Inactive" },
];

export function DirectoryBulkToolbar({ selectedIds, onClearSelection, onComplete }: DirectoryBulkToolbarProps) {
  const { toast } = useToast();

  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [assigneeUserId, setAssigneeUserId] = useState<string>(""); // contacts.assigned_to_user_id
  const [bulkStage, setBulkStage] = useState<string>(""); // contacts.stage
  const [isApplying, setIsApplying] = useState(false);

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
    if (!hasAnyAction || count === 0) return;

    setIsApplying(true);

    try {
      // 1) Bulk assignment -> contacts.assigned_to_user_id
      if (assigneeUserId) {
        const { error } = await supabase
          .from("contacts")
          .update({ assigned_to_user_id: assigneeUserId })
          .in("id", selectedIds);

        if (error) throw error;
      }

      // 2) Bulk stage -> contacts.stage
      if (bulkStage) {
        const { error } = await supabase.from("contacts").update({ stage: bulkStage }).in("id", selectedIds);

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

      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearSelection} disabled={isApplying}>
        <X className="mr-1 h-3 w-3" />
        Clear
      </Button>
    </div>
  );
}
