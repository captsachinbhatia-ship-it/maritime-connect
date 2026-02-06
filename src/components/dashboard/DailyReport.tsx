import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Copy, Check, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentCrmUserId } from '@/services/profiles';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ReportData {
  totalInteractions: number;
  interactionsByType: Record<string, number>;
  followupsCreated: number;
  followupsDueOverdue: number;
  nudgesReceived: number;
  nudgesSent: number;
  nudgesAcknowledged: number;
  contactsAdded: number;
  companiesCreated: number;
  topContacts: { name: string; count: number }[];
  stageBreakdown: Record<string, number>;
}

export function DailyReport() {
  const { crmUser } = useAuth();
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportText, setReportText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateReport = useCallback(async () => {
    setIsGenerating(true);
    try {
      const { data: currentCrmUserId, error: crmError } = await getCurrentCrmUserId();
      if (crmError || !currentCrmUserId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify user' });
        setIsGenerating(false);
        return;
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayISO = startOfToday.toISOString();

      // Get user's assigned contacts
      const { data: assignments } = await supabase
        .from('contact_assignments')
        .select('contact_id, stage')
        .eq('status', 'ACTIVE')
        .eq('assigned_to_crm_user_id', currentCrmUserId)
        .eq('assignment_role', 'PRIMARY');

      const contactIds = [...new Set((assignments || []).map(a => a.contact_id))];

      // Stage breakdown
      const stageBreakdown: Record<string, number> = {};
      (assignments || []).forEach(a => {
        stageBreakdown[a.stage] = (stageBreakdown[a.stage] || 0) + 1;
      });

      // Today's interactions
      let totalInteractions = 0;
      const interactionsByType: Record<string, number> = {};
      const contactInteractionCount: Record<string, number> = {};

      if (contactIds.length > 0) {
        const { data: todayInteractions } = await supabase
          .from('v_contact_interactions_timeline')
          .select('contact_id, interaction_type')
          .in('contact_id', contactIds)
          .gte('interaction_at', todayISO);

        totalInteractions = todayInteractions?.length || 0;
        (todayInteractions || []).forEach(i => {
          interactionsByType[i.interaction_type] = (interactionsByType[i.interaction_type] || 0) + 1;
          contactInteractionCount[i.contact_id] = (contactInteractionCount[i.contact_id] || 0) + 1;
        });
      }

      // Follow-ups created today
      const { count: followupsCreated } = await supabase
        .from('contact_followups')
        .select('*', { count: 'exact', head: true })
        .eq('created_by_crm_user_id', currentCrmUserId)
        .gte('created_at', todayISO);

      // Follow-ups due/overdue
      const endOfToday = new Date(startOfToday);
      endOfToday.setHours(23, 59, 59, 999);
      let followupsDueOverdue = 0;
      if (contactIds.length > 0) {
        const { count } = await supabase
          .from('contact_followups')
          .select('*', { count: 'exact', head: true })
          .in('contact_id', contactIds)
          .eq('status', 'OPEN')
          .lte('due_at', endOfToday.toISOString());
        followupsDueOverdue = count || 0;
      }

      // Nudges
      const { data: nudgesRecv } = await supabase
        .from('v_my_pending_nudges')
        .select('followup_id');
      const nudgesReceived = nudgesRecv?.length || 0;

      const { data: nudgesSentData } = await supabase
        .from('v_nudges_i_created')
        .select('followup_id, display_status')
        .gte('created_at', todayISO);
      const nudgesSent = nudgesSentData?.length || 0;
      const nudgesAcknowledged = (nudgesSentData || []).filter(n => n.display_status === 'ACKNOWLEDGED').length;

      // New contacts & companies today
      const { count: contactsAdded } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('created_by_crm_user_id', currentCrmUserId)
        .gte('created_at', todayISO);

      const { count: companiesCreated } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('created_by_crm_user_id', currentCrmUserId)
        .gte('created_at', todayISO);

      // Top 10 contacts interacted with today
      const topContactIds = Object.entries(contactInteractionCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      let topContacts: { name: string; count: number }[] = [];
      if (topContactIds.length > 0) {
        const { data: contactNames } = await supabase
          .from('contacts')
          .select('id, full_name')
          .in('id', topContactIds.map(([id]) => id));

        const nameMap = new Map(contactNames?.map(c => [c.id, c.full_name || 'Unknown']) || []);
        topContacts = topContactIds.map(([id, count]) => ({
          name: nameMap.get(id) || 'Unknown',
          count,
        }));
      }

      const data: ReportData = {
        totalInteractions,
        interactionsByType,
        followupsCreated: followupsCreated || 0,
        followupsDueOverdue,
        nudgesReceived,
        nudgesSent,
        nudgesAcknowledged,
        contactsAdded: contactsAdded || 0,
        companiesCreated: companiesCreated || 0,
        topContacts,
        stageBreakdown,
      };

      setReport(data);

      // Generate text
      const userName = crmUser?.full_name || 'User';
      const dateStr = format(now, 'dd MMM yyyy');
      const typeSummary = Object.entries(interactionsByType)
        .map(([t, c]) => `  ${t}: ${c}`)
        .join('\n') || '  None';
      const stageSummary = Object.entries(stageBreakdown)
        .map(([s, c]) => `  ${s.replace(/_/g, ' ')}: ${c}`)
        .join('\n') || '  None';
      const topList = topContacts.length > 0
        ? topContacts.map((t, i) => `  ${i + 1}. ${t.name} (${t.count} interactions)`).join('\n')
        : '  None';

      const text = `📊 Daily Report — ${userName} — ${dateStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 Total Interactions: ${totalInteractions}
${typeSummary}

📋 Pipeline Stage Breakdown:
${stageSummary}

📅 Follow-ups:
  Created today: ${data.followupsCreated}
  Due/Overdue: ${data.followupsDueOverdue}

🔔 Nudges:
  Received: ${nudgesReceived}
  Sent: ${nudgesSent}
  Acknowledged: ${nudgesAcknowledged}

➕ New Additions:
  Contacts added: ${data.contactsAdded}
  Companies found: ${data.companiesCreated}

🏆 Top Contacts Touched:
${topList}`;

      setReportText(text);
    } catch (err) {
      console.error('DailyReport error:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate report' });
    } finally {
      setIsGenerating(false);
    }
  }, [crmUser]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      toast({ title: 'Copied', description: 'Report copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to copy' });
    }
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(reportText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <FileText className="h-5 w-5 text-accent-foreground" />
            </div>
            <CardTitle className="text-lg">Daily Report</CardTitle>
          </div>
          <Button size="sm" onClick={generateReport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!report ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click "Generate Report" to create your end-of-day summary.
          </p>
        ) : (
          <div className="space-y-3">
            <pre className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm font-mono leading-relaxed max-h-80 overflow-y-auto">
              {reportText}
            </pre>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy for WhatsApp
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleWhatsApp}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open WhatsApp
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: WhatsApp will open in a new tab with the report pre-filled. It does not send automatically.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
