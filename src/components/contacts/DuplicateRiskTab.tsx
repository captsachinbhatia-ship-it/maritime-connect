import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, RefreshCw, AlertTriangle, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { ContactDetailsDrawer } from './ContactDetailsDrawer';
import { ContactsSearch } from './ContactsSearch';
import { ContactWithCompany } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useCrmUser } from '@/hooks/useCrmUser';

interface DuplicateGroup {
  key: string;
  contacts: Array<{
    id: string;
    full_name: string | null;
    company_name: string | null;
    designation: string | null;
    email: string | null;
    primary_phone: string | null;
    created_at: string | null;
  }>;
}

type PendingAction = {
  action: 'keep_this' | 'keep_both' | 'delete';
  keepId: string;
  otherId: string;
  keepName: string;
  otherName: string;
  rowKey: string;
};

export function DuplicateRiskTab() {
  const { crmUserId } = useCrmUser();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

  // Confirmation dialog state
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, full_name, email, designation, created_at, company_id, is_active')
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        console.error('[DuplicateRiskTab] Error:', error);
        setGroups([]);
        return;
      }

      if (!contacts || contacts.length === 0) {
        setGroups([]);
        return;
      }

      const companyIds = [...new Set(contacts.map(c => c.company_id).filter(Boolean))] as string[];
      let companyMap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, company_name')
          .in('id', companyIds);
        if (companies) {
          companies.forEach(c => { companyMap[c.id] = c.company_name || ''; });
        }
      }

      const contactIds = contacts.map(c => c.id);
      let phoneMap: Record<string, string> = {};
      if (contactIds.length > 0) {
        const { data: phones } = await supabase
          .from('contact_phones')
          .select('contact_id, phone_number')
          .in('contact_id', contactIds)
          .eq('is_primary', true);
        if (phones) {
          phones.forEach(p => { phoneMap[p.contact_id] = p.phone_number || ''; });
        }
      }

      const groupMap = new Map<string, DuplicateGroup['contacts']>();
      for (const c of contacts) {
        const name = (c.full_name || '').toLowerCase().trim();
        const company = c.company_id ? (companyMap[c.company_id] || '').toLowerCase().trim() : '';
        const key = `${name}||${company}`;

        if (!groupMap.has(key)) {
          groupMap.set(key, []);
        }
        groupMap.get(key)!.push({
          id: c.id,
          full_name: c.full_name,
          company_name: c.company_id ? (companyMap[c.company_id] || null) : null,
          designation: c.designation,
          email: c.email,
          primary_phone: phoneMap[c.id] || null,
          created_at: c.created_at,
        });
      }

      const duplicateGroups: DuplicateGroup[] = [];
      for (const [key, members] of groupMap) {
        if (members.length >= 2) {
          duplicateGroups.push({ key, contacts: members });
        }
      }

      duplicateGroups.sort((a, b) => b.contacts.length - a.contacts.length);
      setGroups(duplicateGroups);
    } catch (err) {
      console.error('[DuplicateRiskTab] Failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const s = search.toLowerCase().trim();
    return groups.filter(g =>
      g.contacts.some(c =>
        (c.full_name || '').toLowerCase().includes(s) ||
        (c.company_name || '').toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s) ||
        (c.primary_phone || '').toLowerCase().includes(s)
      )
    );
  }, [groups, search]);

  const totalDuplicateContacts = useMemo(() =>
    filteredGroups.reduce((sum, g) => sum + g.contacts.length, 0),
    [filteredGroups]
  );

  const handleRowClick = (contact: DuplicateGroup['contacts'][0]) => {
    setSelectedContact({
      id: contact.id,
      full_name: contact.full_name,
      company_id: null,
      designation: contact.designation,
      country_code: null,
      phone: null,
      phone_type: null,
      primary_phone: contact.primary_phone,
      primary_phone_type: null,
      email: contact.email,
      ice_handle: null,
      preferred_channel: null,
      notes: null,
      is_active: true,
      updated_at: null,
      created_at: contact.created_at,
      company_name: contact.company_name || undefined,
    });
    setDrawerOpen(true);
  };

  const requestAction = (
    action: 'keep_this' | 'keep_both' | 'delete',
    keepId: string,
    otherId: string,
    keepName: string,
    otherName: string,
    rowKey: string,
  ) => {
    setPendingAction({ action, keepId, otherId, keepName, otherName, rowKey });
    setDeleteConfirmText('');
  };

  const executeResolve = useCallback(async () => {
    if (!pendingAction || !crmUserId) return;
    const { action, keepId, otherId, rowKey } = pendingAction;

    setActionInFlight(rowKey);
    setPendingAction(null);

    try {
      const { error } = await supabase.rpc('resolve_duplicate_contact', {
        p_action: action,
        p_keep_contact_id: keepId,
        p_other_contact_id: otherId,
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Resolved', description: 'Duplicate resolved successfully.' });
        fetchData();
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setActionInFlight(null);
    }
  }, [pendingAction, fetchData, crmUserId]);

  const confirmDialogTitle = useMemo(() => {
    if (!pendingAction) return '';
    switch (pendingAction.action) {
      case 'keep_this': return 'Keep First Contact?';
      case 'keep_both': return 'Keep Both Contacts?';
      case 'delete': return 'Delete Both Contacts?';
    }
  }, [pendingAction]);

  const confirmDialogDescription = useMemo(() => {
    if (!pendingAction) return '';
    switch (pendingAction.action) {
      case 'keep_this':
        return `Keep "${pendingAction.keepName}" and archive "${pendingAction.otherName}"?`;
      case 'keep_both':
        return 'Both contacts will remain active. The duplicate flag will be cleared.';
      case 'delete':
        return '';
    }
  }, [pendingAction]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg">Duplicate Risk</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading...' : `${filteredGroups.length} groups (${totalDuplicateContacts} contacts) with potential duplicates`}
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <ContactsSearch value={search} onChange={setSearch} />
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Review potential duplicates. Choose an action. Changes are permanent.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {search.trim() ? 'No contacts match your search.' : 'No duplicate risks found.'}
              </p>
            </div>
          ) : (
            <TooltipProvider>
              <div className="space-y-4">
                {filteredGroups.map((group) => (
                  <Card key={group.key} className="border-amber-200 dark:border-amber-800">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[80px]">Matches</TableHead>
                              <TableHead>Full Name</TableHead>
                              <TableHead>Company</TableHead>
                              <TableHead>Designation</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead className="w-[260px] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.contacts.map((contact, idx) => {
                              const otherContact = idx === 0 ? group.contacts[1] : group.contacts[0];
                              const pairKey = `${contact.id}-${otherContact.id}`;
                              return (
                                <TableRow
                                  key={contact.id}
                                  className="cursor-pointer"
                                  onClick={() => handleRowClick(contact)}
                                >
                                  <TableCell>
                                    {idx === 0 && (
                                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 text-sm font-bold">
                                        {group.contacts.length}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {contact.full_name || '—'}
                                  </TableCell>
                                  <TableCell>
                                    {contact.company_name ? (
                                      <Badge variant="secondary">{contact.company_name}</Badge>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {contact.designation || '—'}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {contact.email || '—'}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {contact.primary_phone || '—'}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={actionInFlight === pairKey}
                                            onClick={() => requestAction(
                                              'keep_this',
                                              contact.id,
                                              otherContact.id,
                                              contact.full_name || 'Unknown',
                                              otherContact.full_name || 'Unknown',
                                              pairKey,
                                            )}
                                          >
                                            <Check className="mr-1 h-3 w-3" /> Keep First
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Keeps this contact, archives the duplicate</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={actionInFlight === pairKey}
                                            onClick={() => requestAction(
                                              'keep_both',
                                              contact.id,
                                              otherContact.id,
                                              contact.full_name || 'Unknown',
                                              otherContact.full_name || 'Unknown',
                                              pairKey,
                                            )}
                                          >
                                            <CheckCheck className="mr-1 h-3 w-3" /> Keep Both
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Marks both as separate contacts, clears duplicate flag</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            disabled={actionInFlight === pairKey}
                                            onClick={() => requestAction(
                                              'delete',
                                              contact.id,
                                              otherContact.id,
                                              contact.full_name || 'Unknown',
                                              otherContact.full_name || 'Unknown',
                                              pairKey,
                                            )}
                                          >
                                            <Trash2 className="mr-1 h-3 w-3" /> Delete Both
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Permanently deletes BOTH contacts</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === 'delete' ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-1.5 text-destructive font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    This cannot be undone. Both contacts will be permanently deleted.
                  </p>
                  <p>
                    Deleting: <strong>{pendingAction.keepName}</strong> and <strong>{pendingAction.otherName}</strong>
                  </p>
                  <div>
                    <p className="text-sm mb-1">Type <strong>DELETE</strong> to confirm:</p>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="max-w-[200px]"
                    />
                  </div>
                </div>
              ) : (
                confirmDialogDescription
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeResolve}
              disabled={pendingAction?.action === 'delete' && deleteConfirmText !== 'DELETE'}
              className={pendingAction?.action === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {pendingAction?.action === 'keep_this' && 'Keep First'}
              {pendingAction?.action === 'keep_both' && 'Keep Both'}
              {pendingAction?.action === 'delete' && 'Delete Both'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ContactDetailsDrawer
        contact={selectedContact}
        companyName={selectedContact?.company_name || null}
        currentStage={null}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedContact(null);
        }}
        onOwnersChange={fetchData}
        onCompanyChange={() => fetchData()}
      />
    </>
  );
}
