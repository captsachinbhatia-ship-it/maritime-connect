import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, CalendarClock, Bell, Send } from 'lucide-react';
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
  color: string;
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

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  COLD_CALLING: { label: 'Cold Calling', color: 'bg-blue-100 text-blue-800' },
  ASPIRATION: { label: 'Aspiration', color: 'bg-amber-100 text-amber-800' },
  ACHIEVEMENT: { label: 'Achievement', color: 'bg-green-100 text-green-800' },
};

interface TouchTargetsProps {
  onContactClick?: (contact: ContactWithCompany) => void;
}

export function TouchTargets({ onContactClick }: TouchTargetsProps) {
  const navigate = useNavigate();
  const [stageTargets, setStageTargets] = useState<StageTarget[]>([]);
  const [followupsPending, setFollowupsPending] = useState(0);
  const [nudgesReceived, setNudgesReceived] = useState(0);
  const [nudgesSent, setNudgesSent] = useState(0);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
      if (crmError || !currentCrmUserId) {
        setIsLoading(false);
        return;
      }

      // Fetch PRIMARY assignments with stage
      const { data: assignments } = await supabase
        .from('contact_assignments')
        .select('contact_id, stage')
        .eq('status', 'ACTIVE')
        .eq('assigned_to_crm_user_id', currentCrmUserId)
        .eq('assignment_role', 'PRIMARY');

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

      // Fetch last interactions
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

      // Calculate stage targets
      const targets: StageTarget[] = Object.entries(STAGE_CONFIG).map(([stage, config]) => {
        const contacts = contactsByStage[stage] || [];
        const freq = STAGE_FREQUENCY[stage] || 1;
        const target = Math.ceil(contacts.length / freq);
        const completed = contacts.filter(id => {
          const lastAt = interactionMap.get(id);
          return lastAt && new Date(lastAt) >= startOfToday;
        }).length;
        return {
          stage,
          label: config.label,
          assigned: contacts.length,
          target,
          completed,
          pending: Math.max(0, target - completed),
          color: config.color,
        };
      });

      setStageTargets(targets);

      // Fetch follow-ups pending (due today or overdue)
      const endOfToday = new Date(startOfToday);
      endOfToday.setHours(23, 59, 59, 999);

      if (allContactIds.length > 0) {
        const { count: fCount } = await supabase
          .from('contact_followups')
          .select('*', { count: 'exact', head: true })
          .in('contact_id', allContactIds)
          .eq('status', 'OPEN')
          .lte('due_at', endOfToday.toISOString());

        setFollowupsPending(fCount || 0);
      }

      // Fetch nudges received
      const { data: nudgesData } = await supabase
        .from('v_my_pending_nudges')
        .select('followup_id')
        .eq('status', 'OPEN');

      setNudgesReceived(nudgesData?.length || 0);

      // Fetch nudges sent (pending)
      const { data: sentData } = await supabase
        .from('v_nudges_i_created')
        .select('followup_id, display_status')
        .in('display_status', ['PENDING', 'OVERDUE']);

      setNudgesSent(sentData?.length || 0);

      // Build action queue
      const actions: ActionItem[] = [];

      // Contacts needing touch (overdue by stage frequency)
      if (allContactIds.length > 0) {
        const { data: contactsForQueue } = await supabase
          .from('contacts')
          .select('id, full_name, company_id')
          .in('id', allContactIds);

        const { data: companies } = await supabase
          .from('companies')
          .select('id, company_name')
          .in('id', (contactsForQueue || []).map(c => c.company_id).filter(Boolean) as string[]);

        const companyMap = new Map<string, string>(
          (companies || []).map(c => [c.id, c.company_name] as [string, string])
        );
        const contactMap = new Map(
          (contactsForQueue || []).map(c => [c.id, c] as [string, typeof c])
        );

        // Get stage for each contact
        const stageMap = new Map<string, string>();
        (assignments || []).forEach(a => stageMap.set(a.contact_id, a.stage));

        allContactIds.forEach(id => {
          const lastAt = interactionMap.get(id);
          const stage = stageMap.get(id) || '';
          const freq = STAGE_FREQUENCY[stage] || 1;
          const contact = contactMap.get(id);

          if (!contact) return;

          const daysAgo = lastAt
            ? Math.floor((now.getTime() - new Date(lastAt as string).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          if (daysAgo >= freq) {
            actions.push({
              contact_id: id,
              contact_name: (contact as any).full_name || 'Unknown',
              company_name: (contact as any).company_id ? companyMap.get((contact as any).company_id) || null : null,
              stage,
              reason: lastAt ? `Overdue by ${daysAgo - freq + 1}d` : 'Never contacted',
              last_interaction_at: (lastAt as string) || null,
              priority: lastAt ? 2 : 1,
            });
          }
        });
      }

      // Sort by priority (lower = higher priority), then by oldest
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePendingClick = () => navigate('/contacts?tab=my-contacts');
  const handleFollowupsClick = () => navigate('/followups');
  const handleNudgesClick = () => navigate('/');

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">Today's Touch Targets</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Stage Targets */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-center">Assigned</TableHead>
                  <TableHead className="text-center">Target</TableHead>
                  <TableHead className="text-center">Done</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stageTargets.map((st) => (
                  <TableRow key={st.stage}>
                    <TableCell>
                      <Badge className={st.color}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">{st.assigned}</TableCell>
                    <TableCell className="text-center text-sm font-medium">{st.target}</TableCell>
                    <TableCell className="text-center text-sm text-emerald-600 font-medium">{st.completed}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="cursor-pointer transition-colors hover:bg-accent"
                        onClick={handlePendingClick}
                      >
                        {st.pending}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Priority Buckets */}
            <div className="grid grid-cols-3 gap-2">
              <div
                className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors hover:bg-accent/50"
                onClick={handleFollowupsClick}
              >
                <CalendarClock className="h-4 w-4 text-orange-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Follow-ups</p>
                  <p className="text-lg font-bold">{followupsPending}</p>
                </div>
              </div>
              <div
                className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors hover:bg-accent/50"
                onClick={handleNudgesClick}
              >
                <Bell className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Nudges In</p>
                  <p className="text-lg font-bold">{nudgesReceived}</p>
                </div>
              </div>
              <div
                className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors hover:bg-accent/50"
                onClick={handleNudgesClick}
              >
                <Send className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">Nudges Out</p>
                  <p className="text-lg font-bold">{nudgesSent}</p>
                </div>
              </div>
            </div>

            {/* Action Queue */}
            {actionItems.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Contacts To Touch Base Now</p>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Last Touch</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {actionItems.map((item) => (
                        <TableRow
                          key={item.contact_id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleActionClick(item)}
                        >
                          <TableCell className="font-medium text-sm">{item.contact_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.company_name || '—'}</TableCell>
                          <TableCell>
                            {item.stage && STAGE_CONFIG[item.stage] ? (
                              <Badge className={`text-xs ${STAGE_CONFIG[item.stage].color}`}>
                                {STAGE_CONFIG[item.stage].label}
                              </Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.reason}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.last_interaction_at
                              ? formatDistanceToNow(new Date(item.last_interaction_at), { addSuffix: true })
                              : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {actionItems.length >= 10 && (
                  <button
                    className="mt-2 text-xs text-primary hover:underline"
                    onClick={handlePendingClick}
                  >
                    View All →
                  </button>
                )}
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
