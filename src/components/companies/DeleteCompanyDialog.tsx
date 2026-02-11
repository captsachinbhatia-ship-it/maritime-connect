import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

interface DeleteCompanyDialogProps {
  companyId: string;
  companyName: string;
  onDeleted: () => void;
}

interface DependencyCounts {
  contacts: number;
  enquiries: number;
  interactions: number;
  assignments: number;
}

export function DeleteCompanyDialog({ companyId, companyName, onDeleted }: DeleteCompanyDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [deps, setDeps] = useState<DependencyCounts | null>(null);

  const hasDeps = deps && (deps.contacts > 0 || deps.enquiries > 0 || deps.interactions > 0 || deps.assignments > 0);

  useEffect(() => {
    if (!open) {
      setConfirmText('');
      setDeps(null);
      return;
    }
    // Check dependencies
    const checkDeps = async () => {
      setChecking(true);
      try {
        const [contactsRes, assignmentsRes] = await Promise.all([
          supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('company_id', companyId),
          supabase.from('company_assignments').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'ACTIVE'),
        ]);

        setDeps({
          contacts: contactsRes.count ?? 0,
          enquiries: 0, // enquiries may not have company_id FK — safe default
          interactions: 0,
          assignments: assignmentsRes.count ?? 0,
        });
      } catch {
        setDeps({ contacts: 0, enquiries: 0, interactions: 0, assignments: 0 });
      } finally {
        setChecking(false);
      }
    };
    checkDeps();
  }, [open, companyId]);

  const handleDelete = async () => {
    if (confirmText !== companyName) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('companies').delete().eq('id', companyId);
      if (error) {
        toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Company deleted', description: `"${companyName}" has been deleted.` });
      setOpen(false);
      onDeleted();
    } catch (err) {
      toast({ title: 'Delete failed', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Company
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Company
          </DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {checking ? (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking dependencies…
          </div>
        ) : hasDeps ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">
              Cannot delete company because dependent records exist:
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              {deps!.contacts > 0 && <li>Contacts: {deps!.contacts}</li>}
              {deps!.assignments > 0 && <li>Active Assignments: {deps!.assignments}</li>}
              {deps!.enquiries > 0 && <li>Enquiries: {deps!.enquiries}</li>}
              {deps!.interactions > 0 && <li>Interactions: {deps!.interactions}</li>}
            </ul>
            <p className="text-xs text-muted-foreground">
              Remove or reassign these records before deleting.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-semibold text-foreground">"{companyName}"</span> to confirm deletion:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={companyName}
              autoFocus
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          {!hasDeps && !checking && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmText !== companyName || loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
