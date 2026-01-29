import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Users2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TeamMemberStats {
  team_member: string;
  active_contacts: number;
  interactions_today: number;
  stale_contacts: number;
}

export function TeamActivitySnapshot() {
  const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTeamStats = async () => {
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('v_team_activity_snapshot')
          .select('team_member, active_contacts, interactions_today, stale_contacts')
          .order('active_contacts', { ascending: false });

        if (error) {
          console.error('Failed to fetch team stats:', error);
          setTeamStats([]);
        } else {
          setTeamStats(data || []);
        }
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
              {teamStats.map((member, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <p className="font-medium">{member.team_member || 'Unknown'}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{member.active_contacts}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={member.interactions_today > 0 ? 'text-emerald-600' : ''}
                    >
                      {member.interactions_today}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant="outline" 
                      className={member.stale_contacts > 0 ? 'text-orange-600' : ''}
                    >
                      {member.stale_contacts}
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
