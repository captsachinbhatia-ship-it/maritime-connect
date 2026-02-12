import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Loader2, PhoneCall, Mail, Video, MessageSquare, FileEdit, CalendarClock, ArrowRight, MoreHorizontal, Send, Ban, Phone } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useCrmUser } from '@/hooks/useCrmUser';
// Company name comes from the pipeline view — no separate lookup needed
import { changeContactStage } from '@/services/assignments';
import { getNextFollowupDueMap, getFollowupStatusLabel } from '@/services/followups';
import { ContactDetailsDrawer } from './ContactDetailsDrawer';
import { ContactsSearch } from './ContactsSearch';
import { ContactWithCompany } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { SendNudgeDialog } from './SendNudgeDialog';
import { RequestInactiveDialog } from './RequestInactiveDialog';
import { ContactRowHoverCard } from './ContactRowHoverCard';
import { extractKeywordChips } from '@/lib/interactionKeywords';

type StageType = 'COLD_CALLING' | 'ASPIRATION' | 'ACHIEVEMENT' | 'INACTIVE';

const STAGES: { value: StageType; label: string }[] = [
  { value: 'COLD_CALLING', label: 'Cold Calling' },
  { value: 'ASPIRATION', label: 'Aspiration' },
  { value: 'ACHIEVEMENT', label: 'Achievement' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const STAGE_COLORS: Record<StageType, string> = {
  COLD_CALLING: 'bg-blue-100 text-blue-800',
  ASPIRATION: 'bg-amber-100 text-amber-800',
  ACHIEVEMENT: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

const INTERACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <PhoneCall className="h-3 w-3" />,
  WHATSAPP: <MessageSquare className="h-3 w-3" />,
  EMAIL: <Mail className="h-3 w-3" />,
  MEETING: <Video className="h-3 w-3" />,
  NOTE: <FileEdit className="h-3 w-3" />,
};

const FOLLOWUP_STATUS_STYLES: Record<string, string> = {
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  DUE_TODAY: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  UPCOMING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
};

// My Contacts tab shows only PRIMARY ownership contacts with stage sub-tabs
export function MyContactsTab() {
  const { session, loading: authLoading, isAdmin } = useAuth();
  const { crmUserId } = useCrmUser();
  const { toast } = useToast();
  const [activeStage, setActiveStage] = useState<StageType>('COLD_CALLING');
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<StageType, number>>({
    COLD_CALLING: 0,
    ASPIRATION: 0,
    ACHIEVEMENT: 0,
    INACTIVE: 0,
  });
  const [nextFollowupMap, setNextFollowupMap] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStage, setIsUpdatingStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Drawer state
  const [selectedContact, setSelectedContact] = useState<ContactWithCompany | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nudgeContact, setNudgeContact] = useState<{ id: string; name: string } | null>(null);
  const [inactiveContact, setInactiveContact] = useState<{ id: string; name: string } | null>(null);

  const loadStageCounts = useCallback(async () => {
    if (!session || !crmUserId) return;
    try {
      const countPromises = STAGES.map(async (stage) => {
        const { count, error } = await supabase
          .from('v_my_primary_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('stage', stage.value);
        return { stage: stage.value, count: error ? 0 : (count ?? 0) };
      });
      const results = await Promise.all(countPromises);
      const counts: Record<StageType, number> = { COLD_CALLING: 0, ASPIRATION: 0, ACHIEVEMENT: 0, INACTIVE: 0 };
      results.forEach(r => { counts[r.stage] = r.count; });
      setStageCounts(counts);
    } catch { /* keep existing counts */ }
  }, [session, crmUserId]);

  const loadContacts = useCallback(async () => {
    if (!session || !crmUserId) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Single query to the pipeline view filtered by stage
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('v_my_primary_contacts')
        .select('*')
        .eq('stage', activeStage)
        .order('full_name', { ascending: true });

      if (pipelineError) {
        setError(pipelineError.message);
        setContacts([]);
        setIsLoading(false);
        return;
      }

      let contactsList = (pipelineData || []) as ContactWithCompany[];

      // Fetch last interaction data
      if (contactsList.length > 0) {
        const contactIdsForInteraction = contactsList.map(c => c.id);
        const { data: lastInteractionData } = await supabase
          .from('v_contacts_last_interaction')
          .select('*')
          .in('contact_id', contactIdsForInteraction);

        if (lastInteractionData && lastInteractionData.length > 0) {
          const liMap: Record<string, Partial<ContactWithCompany>> = {};
          lastInteractionData.forEach((li: any) => {
            liMap[li.contact_id] = {
              last_interaction_at: li.last_interaction_at,
              last_interaction_type: li.last_interaction_type,
              last_interaction_outcome: li.last_interaction_outcome,
              last_interaction_subject: li.last_interaction_subject || null,
              last_interaction_notes: li.last_interaction_notes || null,
            };
          });
          contactsList = contactsList.map(c => ({
            ...c,
            ...liMap[c.id],
          }));
        }
      }

      setContacts(contactsList);

      // Fetch next follow-up dates
      const contactIdsForFollowups = contactsList.map(c => c.id);
      if (contactIdsForFollowups.length > 0) {
        const followupResult = await getNextFollowupDueMap(contactIdsForFollowups);
        if (followupResult.data) {
          setNextFollowupMap(followupResult.data);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [activeStage, session, crmUserId]);

  // Client-side search filter for multi-field search
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const searchLower = search.toLowerCase().trim();
    return contacts.filter(contact => {
      const fullName = (contact.full_name || '').toLowerCase();
      const companyName = ((contact as any).company_name || '').toLowerCase();
      const email = (contact.email || '').toLowerCase();
      const phone = (contact.primary_phone || '').toLowerCase();
      return fullName.includes(searchLower) || 
             companyName.includes(searchLower) || 
             email.includes(searchLower) || 
             phone.includes(searchLower);
    });
  }, [contacts, search]);

  useEffect(() => {
    if (!authLoading) {
      loadContacts();
      loadStageCounts();
    }
  }, [loadContacts, loadStageCounts, authLoading]);

  const handleStageUpdate = async (contactId: string, newStage: StageType) => {
    setIsUpdatingStage(contactId);

    try {
      const result = await changeContactStage({
        contact_id: contactId,
        to_stage: newStage,
      });

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Failed to update stage',
          description: result.error,
        });
        setIsUpdatingStage(null);
        return;
      }

      if (result.data?.action === 'REQUESTED') {
        toast({
          title: 'Inactive request sent for admin approval',
          description: 'An administrator will review this request.',
        });
      } else {
        toast({
          title: 'Stage updated',
          description: `Contact moved to ${STAGES.find(s => s.value === newStage)?.label}`,
        });
      }

      // Refresh the list and counts
      loadContacts();
      loadStageCounts();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to update stage',
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsUpdatingStage(null);
    }
  };

  const handleRowClick = (e: React.MouseEvent, contact: ContactWithCompany) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menu"]')) {
      return;
    }
    setSelectedContact(contact);
    setDrawerOpen(true);
  };

  const formatLastInteraction = (contact: ContactWithCompany) => {
    if (!contact.last_interaction_at) return null;
    const type = contact.last_interaction_type || '';
    const timeAgo = formatDistanceToNow(new Date(contact.last_interaction_at), { addSuffix: true });
    const outcome = contact.last_interaction_outcome;
    const subject = contact.last_interaction_subject || null;
    const notes = contact.last_interaction_notes || null;
    return { type, timeAgo, outcome, subject, notes };
  };

  const getAvailableStages = (currentStage: StageType) => {
    return STAGES.filter(s => s.value !== currentStage);
  };

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    if (filteredContacts.length === 0) {
      return (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">{search.trim() ? 'No contacts match your search.' : 'No contacts found for this stage.'}</p>
        </div>
      );
    }

    return (
      <TooltipProvider>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Next Follow-up</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => {
                const lastInteraction = formatLastInteraction(contact);
                const nextFollowupDue = nextFollowupMap[contact.id] || null;
                const followupStatus = getFollowupStatusLabel(nextFollowupDue);
                const availableStages = getAvailableStages(activeStage);
                const lastPreview = lastInteraction?.subject || lastInteraction?.notes || null;
                const lastChips = extractKeywordChips(`${lastInteraction?.subject || ''} ${lastInteraction?.notes || ''}`);

                return (
                  <ContactRowHoverCard
                    key={contact.id}
                    lastInteractionSubject={lastInteraction?.subject}
                    lastInteractionNotes={lastInteraction?.notes}
                    nextFollowupDue={nextFollowupDue}
                  >
                    <TableRow
                      className="cursor-pointer"
                      onClick={(e) => handleRowClick(e, contact)}
                    >
                      <TableCell className="font-medium">
                        {contact.full_name || '-'}
                      </TableCell>
                      <TableCell>
                        {(contact as any).company_name || '-'}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const phone = contact.primary_phone || contact.phone;
                          if (!phone) return <span className="text-xs text-muted-foreground/50">—</span>;
                          const code = contact.country_code ? `+${contact.country_code.replace(/^\+/, '')} ` : '';
                          const display = `${code}${phone}`;
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground max-w-[130px] truncate block">
                                  {display}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{display}</TooltipContent>
                            </Tooltip>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground max-w-[140px] truncate block">
                                {contact.email}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{contact.email}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {nextFollowupDue ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <CalendarClock className="h-3 w-3 text-muted-foreground" />
                              <span>{format(new Date(nextFollowupDue), 'MMM d, h:mm a')}</span>
                            </div>
                            {followupStatus && (
                              <Badge className={`text-xs ${FOLLOWUP_STATUS_STYLES[followupStatus]}`}>
                                {followupStatus.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lastInteraction ? (
                          <div className="space-y-0.5 max-w-[200px]">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {INTERACTION_TYPE_ICONS[lastInteraction.type] || null}
                                <span>{lastInteraction.type}</span>
                              </span>
                              <span>·</span>
                              <span>{lastInteraction.timeAgo}</span>
                            </div>
                            {lastPreview && (
                              <p className="text-xs text-muted-foreground/70 line-clamp-1 leading-snug">
                                {lastPreview}
                              </p>
                            )}
                            {lastChips.length > 0 && (
                              <div className="flex flex-wrap gap-0.5">
                                {lastChips.slice(0, 3).map(chip => (
                                  <Badge
                                    key={chip}
                                    variant="outline"
                                    className="h-4 px-1 text-[9px] font-semibold border-amber-500 text-amber-600 dark:text-amber-400"
                                  >
                                    {chip}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isUpdatingStage === contact.id}
                              className="h-7"
                            >
                              {isUpdatingStage === contact.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  Actions
                                  <MoreHorizontal className="ml-1 h-3 w-3" />
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {availableStages.filter(s => s.value !== 'INACTIVE').map((stage) => (
                              <DropdownMenuItem
                                key={stage.value}
                                onClick={() => handleStageUpdate(contact.id, stage.value)}
                              >
                                <Badge className={`mr-2 ${STAGE_COLORS[stage.value]}`}>
                                  {stage.label}
                                </Badge>
                                Move to {stage.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setNudgeContact({ id: contact.id, name: contact.full_name || 'Unknown' })}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send Nudge
                            </DropdownMenuItem>
                            {(activeStage === 'ASPIRATION' || activeStage === 'ACHIEVEMENT') && (
                              <DropdownMenuItem
                                onClick={() => setInactiveContact({ id: contact.id, name: contact.full_name || 'Unknown' })}
                                className="text-destructive focus:text-destructive"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Request Inactive
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </ContactRowHoverCard>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeStage} onValueChange={(val) => {
        setActiveStage(val as StageType);
        setSearch('');
      }}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            {STAGES.map((stage) => (
              <TabsTrigger key={stage.value} value={stage.value}>
                {stage.label} ({stageCounts[stage.value]})
              </TabsTrigger>
            ))}
          </TabsList>
          <ContactsSearch value={search} onChange={setSearch} />
        </div>
      </Tabs>

      <div className="mt-4">
        {renderTable()}
      </div>

      <ContactDetailsDrawer
        contact={selectedContact}
        companyName={(selectedContact as any)?.company_name || null}
        currentStage={activeStage}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedContact(null);
        }}
        onOwnersChange={loadContacts}
        onCompanyChange={() => {
          loadContacts();
        }}
      />
      {nudgeContact && (
        <SendNudgeDialog
          open={!!nudgeContact}
          onOpenChange={(open) => !open && setNudgeContact(null)}
          contactId={nudgeContact.id}
          contactName={nudgeContact.name}
          onSuccess={loadContacts}
        />
      )}

      {inactiveContact && (
        <RequestInactiveDialog
          open={!!inactiveContact}
          onOpenChange={(open) => !open && setInactiveContact(null)}
          contactId={inactiveContact.id}
          contactName={inactiveContact.name}
          onSuccess={loadContacts}
        />
      )}
    </div>
  );
}
