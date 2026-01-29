import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Users2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TeamMemberStats {
  userId: string;
  fullName: string;
  email: string;
  activeContacts: number;
  interactionsToday: number;
  staleContacts: number;
}

export function TeamActivitySnapshot() {
  const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeamStats = async () => {
      setIsLoading(true);

      try {
        // Get all active assignments grouped by user
        const { data: assignments } = await supabase
          .from('contact_assignments')
          .select('assigned_to, contact_id')
          .eq('status', 'ACTIVE');

        if (!assignments || assignments.length === 0) {
          setTeamStats([]);
          setIsLoading(false);
          return;
        }

        // Group contacts by user
        const userContactMap = new Map<string, Set<string>>();
        assignments.forEach(a => {
          if (!userContactMap.has(a.assigned_to)) {
            userContactMap.set(a.assigned_to, new Set());
          }
          userContactMap.get(a.assigned_to)!.add(a.contact_id);
        });

        const userIds = [...userContactMap.keys()];
        const allContactIds = [...new Set(assignments.map(a => a.contact_id))];

        // Fetch user profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profileMap = new Map(
          profiles?.map(p => [p.id, { fullName: p.full_name || 'Unknown', email: p.email || '' }]) || []
        );

        // Get today's interactions
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: todayInteractions } = await supabase
          .from('contact_interactions')
          .select('contact_id')
          .in('contact_id', allContactIds)
          .gte('interaction_at', today.toISOString());

        const touchedTodaySet = new Set(todayInteractions?.map(i => i.contact_id) || []);

        // Get last interaction data for stale calculation
        const { data: lastInteractions } = await supabase
          .from('v_contacts_last_interaction')
          .select('contact_id, last_interaction_at')
          .in('contact_id', allContactIds);

        const interactionMap = new Map(
          lastInteractions?.map(li => [li.contact_id, li.last_interaction_at]) || []
        );

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        // Build stats per user
        const stats: TeamMemberStats[] = userIds.map(userId => {
          const contactIds = userContactMap.get(userId) || new Set();
          const contactArray = [...contactIds];
          
          const activeContacts = contactArray.length;
          const interactionsToday = contactArray.filter(id => touchedTodaySet.has(id)).length;
          const staleContacts = contactArray.filter(id => {
            const lastAt = interactionMap.get(id);
            if (!lastAt) return true;
            return new Date(lastAt) < fourteenDaysAgo;
          }).length;

          const profile = profileMap.get(userId) || { fullName: 'Unknown User', email: '' };

          return {
            userId,
            fullName: profile.fullName,
            email: profile.email,
            activeContacts,
            interactionsToday,
            staleContacts,
          };
        });

        // Sort by active contacts descending
        stats.sort((a, b) => b.activeContacts - a.activeContacts);

        setTeamStats(stats);
      } catch (error) {
        console.error('Failed to fetch team stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamStats();
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Users2 className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Team Activity Snapshot</CardTitle>
            <CardDescription>Performance metrics per team member</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : teamStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No team activity data available</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-center">Today</TableHead>
                <TableHead className="text-center">Stale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamStats.map((member) => (
                <TableRow key={member.userId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{member.fullName}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{member.activeContacts}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={member.interactionsToday > 0 ? 'text-emerald-600' : ''}>
                      {member.interactionsToday}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={member.staleContacts > 0 ? 'text-orange-600' : ''}
                    >
                      {member.staleContacts}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
