import { useState, useEffect } from 'react';
import { Loader2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getActiveCrmUsers } from '@/services/assignPrimary';
import { addAssignment, type AssignmentStage } from '@/services/assignments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface DirectoryBulkToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onComplete: () => void;
}

const STAGES: { value: AssignmentStage; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
];

const CONCURRENCY = 5;

async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<{ error: string | null }>,
  limit: number,
  onProgress: (done: number) => void,
): Promise<{ success: number; failed: number; firstError: string | null }> {
  let success = 0;
  let failed = 0;
  let firstError: string | null = null;
  let done = 0;
  let idx = 0;

  const next = async (): Promise<void> => {
    const i = idx++;
    if (i >= items.length) return;
    const result = await fn(items[i]);
    if (result.error) {
      failed++;
      if (!firstError) firstError = result.error;
    } else {
      success++;
    }
    done++;
    onProgress(done);
    await next();
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => next());
  await Promise.all(workers);
  return { success, failed, firstError };
}

export function DirectoryBulkToolbar({
  selectedIds,
  onClearSelection,
  onComplete,
}: DirectoryBulkToolbarProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [primaryUserId, setPrimaryUserId] = useState('');
  const [secondaryUserId, setSecondaryUserId] = useState('');
  const [bulkStage, setBulkStage] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    getActiveCrmUsers().then((r) => {
      if (r.data) setUsers(r.data);
    });
  }, []);

  const hasAnyAction = !!primaryUserId || !!secondaryUserId || !!bulkStage;
  const count = selectedIds.length;

  const handleApply = async () => {
    if (!hasAnyAction || count === 0) return;
    setIsApplying(true);
    setProgress(0);

    let totalSuccess = 0;
    let totalFailed = 0;
    let firstErr: string | null = null;
    let totalOps = 0;

    // Primary assignments
    if (primaryUserId) {
      const res = await runWithConcurrency(
        selectedIds,
        (cid) =>
          addAssignment({
            contact_id: cid,
            assigned_to_crm_user_id: primaryUserId,
            assignment_role: 'PRIMARY',
            stage: (bulkStage as AssignmentStage) || 'COLD_CALLING',
          }),
        CONCURRENCY,
        (d) => setProgress(d),
      );
      totalSuccess += res.success;
      totalFailed += res.failed;
      if (!firstErr && res.firstError) firstErr = res.firstError;
      totalOps += count;
    }

    // Secondary assignments
    if (secondaryUserId) {
      const res = await runWithConcurrency(
        selectedIds,
        (cid) =>
          addAssignment({
            contact_id: cid,
            assigned_to_crm_user_id: secondaryUserId,
            assignment_role: 'SECONDARY',
            stage: (bulkStage as AssignmentStage) || 'COLD_CALLING',
          }),
        CONCURRENCY,
        (d) => setProgress(d),
      );
      totalSuccess += res.success;
      totalFailed += res.failed;
      if (!firstErr && res.firstError) firstErr = res.firstError;
      totalOps += count;
    }

    // Stage update (direct on contacts table)
    if (bulkStage && !primaryUserId) {
      // If primaryUserId was set, stage was already applied via addAssignment
      // Only do standalone stage update if no primary assignment
      for (const cid of selectedIds) {
        const { error } = await supabase
          .from('contacts')
          .update({ stage: bulkStage })
          .eq('id', cid);

        if (error) {
          totalFailed++;
          if (!firstErr) firstErr = error.message;
        } else {
          totalSuccess++;
        }
      }
      // Also update active assignments stage
      for (const cid of selectedIds) {
        await supabase
          .from('contact_assignments')
          .update({ stage: bulkStage })
          .eq('contact_id', cid)
          .eq('status', 'ACTIVE');
      }
    }

    const description =
      totalFailed > 0
        ? `${totalFailed} failed, ${totalSuccess} succeeded${firstErr ? ` — ${firstErr}` : ''}`
        : `Updated ${totalSuccess} contacts`;

    toast({
      title: 'Bulk update complete',
      description,
      variant: totalFailed > 0 && totalSuccess === 0 ? 'destructive' : 'default',
    });

    setIsApplying(false);
    setPrimaryUserId('');
    setSecondaryUserId('');
    setBulkStage('');
    onClearSelection();
    onComplete();
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 mb-3">
      <div className="flex items-center gap-2 mr-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">
          {count} selected
        </span>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Primary Owner</Label>
        <Select value={primaryUserId} onValueChange={setPrimaryUserId}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="— None —" />
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
        <Label className="text-xs">Secondary Owner</Label>
        <Select value={secondaryUserId} onValueChange={setSecondaryUserId}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="— None —" />
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
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="— None —" />
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

      <Button
        size="sm"
        className="h-8"
        disabled={!hasAnyAction || isApplying}
        onClick={handleApply}
      >
        {isApplying ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Applying…
          </>
        ) : (
          'Apply'
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs"
        onClick={onClearSelection}
        disabled={isApplying}
      >
        <X className="mr-1 h-3 w-3" />
        Clear
      </Button>
    </div>
  );
}
