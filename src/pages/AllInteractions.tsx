import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { MessageSquare, Phone, Mail, Video, StickyNote, ExternalLink, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LogInteractionModal } from '@/components/contacts/LogInteractionModal';

interface Interaction {
  id: string;
  contact_id: string;
  contact_name: string;
  company_name: string | null;
  interaction_type: string;
  interaction_at: string;
  subject: string | null;
  notes: string | null;
  outcome: string | null;
  creator_full_name: string | null;
}

const typeIcons: Record<string, typeof Phone> = {
  COLD_CALL: Phone, CALL: Phone, EMAIL_SENT: Mail,
  WHATSAPP_SENT: MessageSquare, WHATSAPP_REPLY: MessageSquare,
  MEETING: Video, NOTE: StickyNote,
};

export default function AllInteractions() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('v_interaction_timeline_v2')
        .select('*')
        .order('interaction_at', { ascending: false })
        .limit(100);

      if (typeFilter !== 'all') query = query.eq('interaction_type', typeFilter);
      if (outcomeFilter !== 'all') query = query.eq('outcome', outcomeFilter);
      if (dateRange !== 'all') {
        const days = parseInt(dateRange, 10);
        if (!isNaN(days)) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          query = query.gte('interaction_at', cutoff.toISOString());
        }
      }
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`subject.ilike.${term},notes.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) { console.error(error.message); setInteractions([]); return; }
      setInteractions((data || []).map((r: any) => ({
        id: r.id,
        contact_id: r.contact_id,
        contact_name: r.contact_name || r.full_name || 'Unknown',
        company_name: r.company_name || null,
        interaction_type: r.interaction_type,
        interaction_at: r.interaction_at,
        subject: r.subject || null,
        notes: r.notes || null,
        outcome: r.outcome || null,
        creator_full_name: r.creator_full_name || r.creator_name || null,
      })));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, outcomeFilter, dateRange, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const h = () => fetchData();
    window.addEventListener('dashboard:refresh', h);
    return () => window.removeEventListener('dashboard:refresh', h);
  }, [fetchData]);

  const openContact = (contactId: string) => {
    window.open(`/contacts?contact=${contactId}&tab=interactions`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Interactions</h1>
          <p className="text-sm text-muted-foreground">V2 interaction timeline across all contacts</p>
        </div>
        <Button onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Log Interaction
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search subject/notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="1">Today</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="COLD_CALL">Cold Call</SelectItem>
            <SelectItem value="CALL">Call</SelectItem>
            <SelectItem value="EMAIL_SENT">Email Sent</SelectItem>
            <SelectItem value="WHATSAPP_SENT">WhatsApp Sent</SelectItem>
            <SelectItem value="WHATSAPP_REPLY">WhatsApp Reply</SelectItem>
            <SelectItem value="MEETING">Meeting</SelectItem>
            <SelectItem value="NOTE">Note</SelectItem>
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="INTERESTED">Positive</SelectItem>
            <SelectItem value="NO_RESPONSE">No Response</SelectItem>
            <SelectItem value="NOT_INTERESTED">Not Interested</SelectItem>
            <SelectItem value="FOLLOW_UP">Follow-up Needed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : interactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No interactions found</p>
          ) : (
            <div className="space-y-2">
              {interactions.map((ix) => {
                const Icon = typeIcons[ix.interaction_type] || MessageSquare;
                return (
                  <div key={ix.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted mt-0.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{ix.contact_name}</p>
                        {ix.company_name && (
                          <span className="text-xs text-muted-foreground">— {ix.company_name}</span>
                        )}
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openContact(ix.contact_id)} title="Open contact">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                      {ix.subject && <p className="text-xs text-foreground/80 mt-0.5">{ix.subject}</p>}
                      {ix.notes && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ix.notes}</p>}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">{ix.interaction_type}</Badge>
                        {ix.outcome && <Badge variant="outline" className="text-[10px] py-0 h-4">{ix.outcome}</Badge>}
                        {ix.creator_full_name && <span className="text-[10px] text-muted-foreground">by {ix.creator_full_name}</span>}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(ix.interaction_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <LogInteractionModal isOpen={logOpen} onClose={() => setLogOpen(false)} onSuccess={() => { setLogOpen(false); fetchData(); }} />
    </div>
  );
}
