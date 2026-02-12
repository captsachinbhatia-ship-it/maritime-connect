import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, ShieldAlert, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabaseClient';
import { getUserNames } from '@/services/interactions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DeleteCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  onSuccess: () => void;
}

interface PreviewData {
  contacts_total: number;
  contacts_active: number;
  contacts_inactive: number;
  contacts_archived: number;
  assignments_active: number;
  phones: number;
  interactions: number;
  followups_open: number;
}

interface ContactRow {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
  deleted_at: string | null;
  primary_owner_id: string | null;
  secondary_owner_id: string | null;
  primary_stage: string | null;
  created_at: string | null;
}

function getContactStatus(c: ContactRow): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } {
  if (c.deleted_at) return { label: 'Archived', variant: 'destructive' };
  if (c.is_active === false) return { label: 'Inactive', variant: 'secondary' };
  return { label: 'Active', variant: 'default' };
}

export function DeleteCompanyModal({
  open,
  onOpenChange,
  companyId,
  companyName,
  onSuccess,
}: DeleteCompanyModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [purgeText, setPurgeText] = useState('');
  const [confirmDetach, setConfirmDetach] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  useEffect(() => {
    if (!open) {
      setPreview(null);
      setContacts([]);
      setUserNamesMap({});
      setError(null);
      setPurgeText('');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [previewRes, contactsRes] = await Promise.all([
          supabase.rpc('admin_company_delete_preview', { p_company_id: companyId }),
          supabase.rpc('admin_company_contacts_list', { p_company_id: companyId }),
        ]);

        if (previewRes.error) throw new Error(previewRes.error.message);
        if (contactsRes.error) throw new Error(contactsRes.error.message);

        const previewRow = Array.isArray(previewRes.data) ? previewRes.data[0] : previewRes.data;
        setPreview(previewRow as PreviewData);

        const contactsList = (contactsRes.data || []) as ContactRow[];
        setContacts(contactsList);

        // Resolve owner names
        const ids = new Set<string>();
        contactsList.forEach((c) => {
          if (c.primary_owner_id) ids.add(c.primary_owner_id);
          if (c.secondary_owner_id) ids.add(c.secondary_owner_id);
        });
        if (ids.size > 0) {
          const namesResult = await getUserNames(Array.from(ids));
          if (namesResult.data) setUserNamesMap(namesResult.data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, companyId]);

  const handleDetach = async () => {
    setConfirmDetach(false);
    setActing(true);
    try {
      const { error } = await supabase.rpc('admin_delete_company_detach_contacts', { p_company_id: companyId });
      if (error) throw new Error(error.message);
      toast({ title: 'Company deleted', description: `Contacts detached. "${companyName}" deleted.` });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Detach failed');
    } finally {
      setActing(false);
    }
  };

  const handlePurge = async () => {
    setConfirmPurge(false);
    setActing(true);
    try {
      const { error } = await supabase.rpc('admin_delete_company_purge_contacts', { p_company_id: companyId });
      if (error) throw new Error(error.message);
      toast({ title: 'Company purged', description: `"${companyName}" and all contacts permanently deleted.` });
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Purge failed');
    } finally {
      setActing(false);
    }
  };

  const ownerName = (id: string | null) => {
    if (!id) return 'Unassigned';
    return userNamesMap[id] || id.slice(0, 8);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={acting ? undefined : onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Company: {companyName}
            </DialogTitle>
            <DialogDescription>
              This action is admin-only. Choose <strong>Detach</strong> to keep contacts and history.
              Choose <strong>Purge</strong> to permanently delete contacts and audit trail.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : preview ? (
            <div className="space-y-4 overflow-hidden flex-1 flex flex-col min-h-0">
              {/* Preview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Total Contacts', value: preview.contacts_total },
                  { label: 'Active', value: preview.contacts_active },
                  { label: 'Inactive', value: preview.contacts_inactive },
                  { label: 'Archived', value: preview.contacts_archived },
                  { label: 'Active Assignments', value: preview.assignments_active },
                  { label: 'Phones', value: preview.phones },
                  { label: 'Interactions', value: preview.interactions },
                  { label: 'Open Followups', value: preview.followups_open },
                ].map((item) => (
                  <div key={item.label} className="rounded-md border bg-muted/30 p-2 text-center">
                    <p className="text-lg font-bold text-foreground">{item.value}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Contacts List */}
              <div className="flex-1 min-h-0">
                <h4 className="text-sm font-semibold mb-2">Linked Contacts ({contacts.length})</h4>
                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Primary</TableHead>
                        <TableHead className="text-xs">Secondary</TableHead>
                        <TableHead className="text-xs">Stage</TableHead>
                        <TableHead className="text-xs">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">
                            No contacts linked
                          </TableCell>
                        </TableRow>
                      ) : (
                        contacts.map((c) => {
                          const status = getContactStatus(c);
                          return (
                            <TableRow key={c.id}>
                              <TableCell className="text-xs font-medium py-2">{c.full_name || '—'}</TableCell>
                              <TableCell className="text-xs py-2">{c.email || '—'}</TableCell>
                              <TableCell className="py-2">
                                <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs py-2">{ownerName(c.primary_owner_id)}</TableCell>
                              <TableCell className="text-xs py-2">{ownerName(c.secondary_owner_id)}</TableCell>
                              <TableCell className="text-xs py-2">
                                {c.primary_stage ? (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {c.primary_stage}
                                  </Badge>
                                ) : '—'}
                              </TableCell>
                              <TableCell className="text-xs py-2">
                                {c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy') : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          ) : null}

          {!loading && preview && (
            <DialogFooter className="flex-col sm:flex-row gap-4 pt-4 border-t">
              {/* Detach */}
              <div className="flex-1 space-y-1">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={acting}
                  onClick={() => setConfirmDetach(true)}
                >
                  {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlink className="h-4 w-4 mr-2" />}
                  Detach & Delete
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Contacts kept, become unassigned
                </p>
              </div>

              {/* Purge */}
              <div className="flex-1 space-y-1">
                <Input
                  value={purgeText}
                  onChange={(e) => setPurgeText(e.target.value)}
                  placeholder='Type DELETE to enable'
                  className="text-xs h-8 mb-1"
                />
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={acting || purgeText !== 'DELETE'}
                  onClick={() => setConfirmPurge(true)}
                >
                  {acting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
                  Purge & Delete
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  Permanent — contacts + history removed
                </p>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Detach Confirmation */}
      <AlertDialog open={confirmDetach} onOpenChange={setConfirmDetach}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detach contacts and delete company?</AlertDialogTitle>
            <AlertDialogDescription>
              All contacts will be kept but unlinked from "{companyName}". The company record will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDetach} disabled={acting}>
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Detach & Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Purge Confirmation */}
      <AlertDialog open={confirmPurge} onOpenChange={setConfirmPurge}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Permanent Purge — Cannot Be Undone</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{companyName}", all linked contacts, and their entire history (interactions, followups, assignments, phones). This cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurge}
              disabled={acting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {acting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
