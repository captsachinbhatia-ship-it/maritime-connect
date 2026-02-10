import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, CalendarClock, Bell, Send, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { formatDistanceToNow } from 'date-fns';
import { ContactWithCompany } from '@/types';

interface StageTarget {
  stage: string;
  label: string;
  assigned: number;
  target: number;
  completed: number;
  pending: number;
}

interface ActionItem {
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  stage: string | null;
  reason: string;
  last_interaction_at: string | null;
  priority: number;
}

const STAGE_FREQUENCY: Record<string, number> = {
  COLD_CALLING: 1,
  ASPIRATION: 2,
  ACHIEVEMENT: 3,
};

const STAGE_LABELS: Record<string, string> = {
  COLD_CALLING: 'Cold Calling',
  ASPIRATION: 'Aspiration',
  ACHIEVEMENT: 'Achievement',
};

interface TouchTargetsProps {
  onContactClick?: (contact: ContactWithCompany) => void;
  /** undefined = logged-in user, null = all users, string = specific user */
  crmUserId?: string | null;
  /** Whether the current user is an admin (shows unassigned count) */
  isAdmin?: boolean;
}

export function TouchTargets({ onContactClick, crmUserId: crmUserIdProp, isAdmin }: TouchTargetsProps) {
  const navigate = useNavigate();
  const [stageTargets, setStageTargets] = useState<StageTarget[]>([]);
  const [followupsPending, setFollowupsPending] = useState(0);
  const [nudgesReceived, setNudgesReceived] = useState(0);
  const [nudgesSent, setNudgesSent] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let userId: string | null = null;

      if (crmUserIdProp === undefined) {
        const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
        if (crmError || !currentCrmUserId) {
          setIsLoading(false);
          return;
        }
        userId = currentCrmUserId;
      } else {
        userId = crmUserIdProp;
      }

      let assignQuery = supabase
        .from('contact_assignments')
        .select('contact_id, stage')
        .eq('status', 'ACTIVE')
        .eq('assignment_role', 'PRIMARY');

      if (userId) {
        assignQuery = assignQuery.eq('assigned_to_crm_user_id', userId);
      }

      const { data: assignments } = await assignQuery;

      const contactsByStage: Record<string, string[]> = {
        COLD_CALLING: [],
        ASPIRATION: [],
        ACHIEVEMENT: [],
      };

      (assignments || []).forEach(a => {
        if (contactsByStage[a.stage]) {
          contactsByStage[a.stage].push(a.contact_id);
        }
      });

      const allContactIds = Object.values(contactsByStage).flat();

      const { data: interactions } = allContactIds.length > 0
        ? await supabase
            .from('v_contacts_last_interaction')
            .select('contact_id, last_interaction_at')
            .in('contact_id', allContactIds)
        : { data: [] };

      const interactionMap = new Map<string, string | null>(
        (interactions || []).map(i => [i.contact_id, i.last_interaction_at] as [string, string | null])
      );

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const targets: StageTarget[] = Object.keys(STAGE_LABELS).map(stage => {
        const contacts = contactsByStage[stage] || [];
        const freq = STAGE_FREQUENCY[stage] || 1;
        const target = Math.ceil(contacts.length / freq);
        const completed = contacts.filter(id => {
          const lastAt = interactionMap.get(id);
          return lastAt && new Date(lastAt) >= startOfToday;
        }).length;
        return {
          stage,
          label: STAGE_LABELS[stage],
          assigned: contacts.length,
          target,
          completed,
          pending: Math.max(0, target - completed),
        };
      });

      setStageTargets(targets);

      // Follow-ups pending
      const endOfToday = new Date(startOfToday);
      endOfToday.setHours(23, 59, 59, 999);

      if (allContactIds.length > 0) {
        const { count: fCount } = await supabase
          .from('contact_followups')
          .select('*', { count: 'exact', head: true })
          .in('contact_id', allContactIds)
          .eq('status', 'OPEN')
          .lte('due_at', endOfToday.toISOString());
        setFollowupsPending(fCount ?? 0);
      } else if (!userId) {
        const { count: fCount } = await supabase
          .from('contact_followups')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'OPEN')
          .lte('due_at', endOfToday.toISOString());
        setFollowupsPending(fCount ?? 0);
      }

      // Nudges
      const { data: nudgesData } = await supabase
        .from('v_my_pending_nudges')
        .select('followup_id')
        .eq('status', 'OPEN');
      setNudgesReceived(nudgesData?.length ?? 0);

      const { data: sentData } = await supabase
        .from('v_nudges_i_created')
        .select('followup_id, display_status')
        .in('display_status', ['PENDING', 'OVERDUE']);
      setNudgesSent(sentData?.length ?? 0);

      // Unassigned contacts count (admin only)
      if (isAdmin) {
        const { data: activePrimaryAssignments } = await supabase
          .from('contact_assignments')
          .select('contact_id')
          .eq('status', 'ACTIVE')
          .eq('assignment_role', 'PRIMARY')
          .not('assigned_to_crm_user_id', 'is', null);

        const assignedContactIds = new Set(
          (activePrimaryAssignments || []).map(a => a.contact_id)
        );

        const { data: allContacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('is_active', true);

        const unassigned = (allContacts || []).filter(
          c => !assignedContactIds.has(c.id)
        ).length;
        setUnassignedCount(unassigned);
      }

      // Build action queue
      const actions: ActionItem[] = [];

      if (allContactIds.length > 0) {
        const { data: contactsForQueue } = await supabase
          .from('contacts')
          .select('id, full_name, company_id')
          .in('id', allContactIds.slice(0, 500));

        const companyIds = (contactsForQueue || []).map(c => c.company_id).filter(Boolean) as string[];
        const { data: companies } = companyIds.length > 0
          ? await supabase.from('companies').select('id, company_name').in('id', companyIds)
          : { data: [] };

        const companyMap = new Map<string, string>(
          (companies || []).map(c => [c.id, c.company_name] as [string, string])
        );
        const contactMap = new Map(
          (contactsForQueue || []).map(c => [c.id, c] as [string, typeof c])
        );

        const stageMap = new Map<string, string>();
        (assignments || []).forEach(a => stageMap.set(a.contact_id, a.stage));

        allContactIds.forEach(id => {
          const lastAt = interactionMap.get(id);
          const stage = stageMap.get(id) || '';
          const freq = STAGE_FREQUENCY[stage] || 1;
          const contact = contactMap.get(id);
          if (!contact) return;

          const daysAgo = lastAt
            ? Math.floor((now.getTime() - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          if (daysAgo >= freq) {
            actions.push({
              contact_id: id,
              contact_name: contact.full_name || 'Unknown',
              company_name: contact.company_id ? companyMap.get(contact.company_id) || null : null,
              stage,
              reason: lastAt ? `Overdue by ${daysAgo - freq + 1}d` : 'Never contacted',
              last_interaction_at: lastAt || null,
              priority: lastAt ? 2 : 1,
            });
          }
        });
      }

      actions.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const aTime = a.last_interaction_at ? new Date(a.last_interaction_at).getTime() : 0;
        const bTime = b.last_interaction_at ? new Date(b.last_interaction_at).getTime() : 0;
        return aTime - bTime;
      });

      setActionItems(actions.slice(0, 10));
    } catch (err) {
      console.error('TouchTargets error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [crmUserIdProp, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePendingClick = () => navigate('/contacts?tab=my-contacts');
  const handleFollowupsClick = () => navigate('/followups');
  const handleNudgesClick = () => navigate('/');
  const handleUnassignedClick = () => navigate('/unassigned-contacts');

  const handleActionClick = (item: ActionItem) => {
    if (onContactClick) {
      onContactClick({
        id: item.contact_id,
        full_name: item.contact_name,
        company_id: null,
        designation: null,
        country_code: null,
        phone: null,
        phone_type: null,
        primary_phone: null,
        primary_phone_type: null,
        email: null,
        ice_handle: null,
        preferred_channel: null,
        notes: null,
        is_active: true,
        updated_at: null,
        created_at: null,
      } as ContactWithCompany);
    }
  };

  const showUnassigned = isAdmin && unassignedCount >= 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Target className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-base">Today's Touch Targets</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ) : (
          <>
            {/* Stage Targets */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Stage</TableHead>
                    <TableHead className="text-xs text-right">Assigned</TableHead>
                    <TableHead className="text-xs text-right">Target</TableHead>
                    <TableHead className="text-xs text-right">Done</TableHead>
                    <TableHead className="text-xs text-right">Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stageTargets.map((st) => (
                    <TableRow key={st.stage}>
                      <TableCell className="text-sm py-2 font-medium">{st.label}</TableCell>
                      <TableCell className="text-right text-sm py-2 tabular-nums">{st.assigned}</TableCell>
                      <TableCell className="text-right text-sm py-2 tabular-nums font-medium">{st.target}</TableCell>
                      <TableCell className="text-right text-sm py-2 tabular-nums font-medium text-emerald-600">{st.completed}</TableCell>
                      <TableCell className="text-right py-2">
                        <span
                          className="cursor-pointer text-sm tabular-nums font-medium text-primary hover:underline"
                          onClick={handlePendingClick}
                        >
                          {st.pending}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Priority Buckets */}
            <div className={`grid gap-2 ${showUnassigned ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <button
                className="flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent/50"
                onClick={handleFollowupsClick}
              >
                <CalendarClock className="h-4 w-4 text-orange-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-tight">Follow-ups</p>
                  <p className="text-lg font-bold tabular-nums leading-tight">{followupsPending}</p>
                </div>
              </button>
              <button
                className="flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent/50"
                onClick={handleNudgesClick}
              >
                <Bell className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-tight">Nudges In</p>
                  <p className="text-lg font-bold tabular-nums leading-tight">{nudgesReceived}</p>
                </div>
              </button>
              <button
                className="flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent/50"
                onClick={handleNudgesClick}
              >
                <Send className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-tight">Nudges Out</p>
                  <p className="text-lg font-bold tabular-nums leading-tight">{nudgesSent}</p>
                </div>
              </button>
              {showUnassigned && (
                <button
                  className="flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent/50 border-orange-300/50"
                  onClick={handleUnassignedClick}
                >
                  <Users className="h-4 w-4 text-orange-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground leading-tight">Unassigned</p>
                    <p className="text-lg font-bold tabular-nums leading-tight text-orange-600">{unassignedCount}</p>
                  </div>
                </button>
              )}
            </div>

            {/* Action Queue */}
            {actionItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Contacts To Touch Now</p>
                  {actionItems.length >= 10 && (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={handlePendingClick}
                    >
                      View All →
                    </button>
                  )}
                </div>
                <div className="rounded-md border max-h-[350px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sticky top-0 bg-background">Contact</TableHead>
                        <TableHead className="text-xs sticky top-0 bg-background">Stage</TableHead>
                        <TableHead className="text-xs sticky top-0 bg-background">Reason</TableHead>
                        <TableHead className="text-xs text-right sticky top-0 bg-background">Last Touch</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actionItems.map((item) => (
                        <TableRow
                          key={item.contact_id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleActionClick(item)}
                        >
                          <TableCell className="py-2">
                            <div>
                              <p className="text-sm font-medium leading-tight">{item.contact_name}</p>
                              {item.company_name && (
                                <p className="text-[11px] text-muted-foreground leading-tight">{item.company_name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-xs text-muted-foreground">
                              {item.stage ? STAGE_LABELS[item.stage] || item.stage : '—'}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[11px]">
                              {item.reason}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground py-2">
                            {item.last_interaction_at
                              ? formatDistanceToNow(new Date(item.last_interaction_at), { addSuffix: true })
                              : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-[11px] text-muted-foreground text-center mt-1.5">
                  Click a row to open contact details
                </p>
              </div>
            )}

            {actionItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">All caught up — no overdue contacts!</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
