import { useState, useRef } from 'react';
import { Upload, Zap, Loader2, Ship, Anchor, TrendingUp, Users, Activity, ChevronDown, ChevronUp, Database, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface CargoEnquiry {
  vessel_class: string | null;
  cargo_type: string | null;
  load_port: string | null;
  load_region: string | null;
  discharge_port: string | null;
  discharge_region: string | null;
  laycan_raw: string | null;
  quantity_mt: number | null;
  rate_ws: number | null;
  rate_lumpsum: number | null;
  charterer: string | null;
  broker: string | null;
  status: string | null;
  last_cargo: string | null;
  coating_required: boolean | null;
  heating_required: boolean | null;
  notes: string | null;
}

interface VesselPosition {
  vessel_name: string | null;
  vessel_class: string | null;
  open_port: string | null;
  open_region: string | null;
  open_date_raw: string | null;
  last_cargo: string | null;
  owner: string | null;
  operator: string | null;
  coated: boolean | null;
  heated: boolean | null;
  notes: string | null;
}

interface RateIndication {
  route: string | null;
  vessel_class: string | null;
  rate_ws: number | null;
  rate_lumpsum: number | null;
  tce_usd_day: number | null;
  notes: string | null;
}

interface Contact {
  name: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
}

interface TeamInteraction {
  sender_name: string | null;
  action_type: string | null;
  summary: string | null;
  message_timestamp: string | null;
}

interface ParsedResult {
  cargo_enquiries: CargoEnquiry[];
  vessel_positions: VesselPosition[];
  rate_indications: RateIndication[];
  contacts: Contact[];
  team_interactions: TeamInteraction[];
  summary: string;
  was_truncated: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Enquiry: 'bg-amber-100 text-amber-800 border-amber-200',
  'On Subjects': 'bg-blue-100 text-blue-800 border-blue-200',
  Fixed: 'bg-green-100 text-green-800 border-green-200',
  Failed: 'bg-red-100 text-red-800 border-red-200',
};

const ACTION_COLORS: Record<string, string> = {
  'Enquiry Received': 'bg-amber-100 text-amber-800',
  'Fixture Confirmed': 'bg-green-100 text-green-800',
  'Position Sent': 'bg-blue-100 text-blue-800',
  'Rate Given': 'bg-purple-100 text-purple-800',
  'Follow-up': 'bg-orange-100 text-orange-800',
  Negotiation: 'bg-cyan-100 text-cyan-800',
};

type InsertStatus = Record<string, 'inserting' | 'success' | 'error'>;

export default function WhatsAppParser() {
  const [chatText, setChatText] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [error, setError] = useState('');
  const [insertStatus, setInsertStatus] = useState<InsertStatus>({});
  const [showRaw, setShowRaw] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setChatText(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleParse = async () => {
    if (!chatText.trim()) {
      setError('Please upload or paste a WhatsApp chat export first.');
      return;
    }
    setLoading(true);
    setError('');
    setParsed(null);
    setInsertStatus({});

    try {
      const { data, error: fnError } = await supabase.functions.invoke('parse-whatsapp-chat', {
        body: { chat_text: chatText },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setParsed(data as ParsedResult);
      toast({ title: 'Parsing complete', description: data.summary });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError('Parsing failed: ' + msg);
    }
    setLoading(false);
  };

  const handleInsert = async (tableKey: keyof ParsedResult, tableName: string) => {
    const rows = parsed?.[tableKey];
    if (!Array.isArray(rows) || rows.length === 0) return;

    setInsertStatus((s) => ({ ...s, [tableKey]: 'inserting' }));

    try {
      // Add source_group to track WhatsApp origin
      const withSource = rows.map((r: Record<string, unknown>) => ({
        ...r,
        source_group: 'whatsapp_import',
      }));

      const { error: insertErr } = await supabase.from(tableName).insert(withSource);
      if (insertErr) throw insertErr;

      setInsertStatus((s) => ({ ...s, [tableKey]: 'success' }));
      toast({ title: 'Inserted', description: `${rows.length} ${tableKey.replace(/_/g, ' ')} saved to database.` });
    } catch (err: unknown) {
      setInsertStatus((s) => ({ ...s, [tableKey]: 'error' }));
      const msg = err instanceof Error ? err.message : 'Insert failed';
      toast({ title: 'Insert failed', description: msg, variant: 'destructive' });
    }
  };

  const TABLE_MAP: Record<string, string> = {
    cargo_enquiries: 'cargo_enquiries',
    vessel_positions: 'vessel_positions',
    rate_indications: 'rate_indications',
    contacts: 'contacts',
    team_interactions: 'team_interactions',
  };

  const counts = parsed
    ? {
        cargo_enquiries: parsed.cargo_enquiries?.length || 0,
        vessel_positions: parsed.vessel_positions?.length || 0,
        rate_indications: parsed.rate_indications?.length || 0,
        contacts: parsed.contacts?.length || 0,
        team_interactions: parsed.team_interactions?.length || 0,
      }
    : null;

  const totalCount = counts
    ? counts.cargo_enquiries + counts.vessel_positions + counts.rate_indications + counts.contacts + counts.team_interactions
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">WhatsApp Chat Parser</h1>
        <p className="mt-1 text-muted-foreground">
          Extract fixtures, positions, rates, and contacts from WhatsApp chat exports
        </p>
      </div>

      {/* Upload / Paste Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upload .txt Export</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFile} />
              <Upload className="h-8 w-8 text-muted-foreground/50" />
              {fileName ? (
                <span className="text-sm text-green-600 font-medium">{fileName}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Click to upload .txt file</span>
              )}
              <span className="text-xs text-muted-foreground">WhatsApp &rarr; Chat &rarr; Export (without media)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Or Paste Chat Text</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder={'[12/03/24, 09:14] Broker A: VLCC 270k AG/Japan laycan 10-15 Apr WS 62 pls revert\n[12/03/24, 09:22] Owner B: MV STAR OCEAN open Fujairah 18 Apr last cgo FO...'}
              className="h-[136px] text-xs resize-none font-mono"
            />
          </CardContent>
        </Card>
      </div>

      {/* Parse Button + Error */}
      <div className="flex items-center gap-4">
        <Button onClick={handleParse} disabled={loading || !chatText.trim()} size="lg">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing with Claude...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" /> Extract Maritime Data
            </>
          )}
        </Button>
        {error && (
          <Alert variant="destructive" className="flex-1">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Results */}
      {parsed && (
        <div className="space-y-4">
          {/* Summary Bar */}
          <Card>
            <CardContent className="flex items-center gap-6 py-3 flex-wrap">
              <Badge variant="default">{totalCount} items extracted</Badge>
              {counts!.cargo_enquiries > 0 && <span className="text-xs text-muted-foreground"><Ship className="h-3 w-3 inline mr-1" />{counts!.cargo_enquiries} Cargo</span>}
              {counts!.vessel_positions > 0 && <span className="text-xs text-muted-foreground"><Anchor className="h-3 w-3 inline mr-1" />{counts!.vessel_positions} Positions</span>}
              {counts!.rate_indications > 0 && <span className="text-xs text-muted-foreground"><TrendingUp className="h-3 w-3 inline mr-1" />{counts!.rate_indications} Rates</span>}
              {counts!.contacts > 0 && <span className="text-xs text-muted-foreground"><Users className="h-3 w-3 inline mr-1" />{counts!.contacts} Contacts</span>}
              {counts!.team_interactions > 0 && <span className="text-xs text-muted-foreground"><Activity className="h-3 w-3 inline mr-1" />{counts!.team_interactions} Activity</span>}
              <span className="ml-auto text-xs text-muted-foreground max-w-xs truncate">{parsed.summary}</span>
            </CardContent>
          </Card>

          {parsed.was_truncated && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Chat was truncated to 60,000 characters. Some messages at the end may not have been parsed.</AlertDescription>
            </Alert>
          )}

          {/* Tabs */}
          <Tabs defaultValue="cargo">
            <TabsList>
              <TabsTrigger value="cargo">Cargo ({counts!.cargo_enquiries})</TabsTrigger>
              <TabsTrigger value="positions">Positions ({counts!.vessel_positions})</TabsTrigger>
              <TabsTrigger value="rates">Rates ({counts!.rate_indications})</TabsTrigger>
              <TabsTrigger value="contacts">Contacts ({counts!.contacts})</TabsTrigger>
              <TabsTrigger value="activity">Activity ({counts!.team_interactions})</TabsTrigger>
            </TabsList>

            {/* Cargo Enquiries */}
            <TabsContent value="cargo" className="mt-4">
              {parsed.cargo_enquiries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No cargo enquiries found.</p>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Laycan</TableHead>
                          <TableHead className="text-right">Qty (MT)</TableHead>
                          <TableHead className="text-right">Rate WS</TableHead>
                          <TableHead>Charterer/Broker</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsed.cargo_enquiries.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold">{e.vessel_class || '—'}</TableCell>
                            <TableCell>{e.cargo_type || '—'}</TableCell>
                            <TableCell className="text-xs">{e.load_port || e.load_region || '?'} &rarr; {e.discharge_port || e.discharge_region || '?'}</TableCell>
                            <TableCell className="text-xs">{e.laycan_raw || '—'}</TableCell>
                            <TableCell className="text-right font-mono">{e.quantity_mt?.toLocaleString() || '—'}</TableCell>
                            <TableCell className="text-right font-mono">{e.rate_ws ?? e.rate_lumpsum ?? '—'}</TableCell>
                            <TableCell className="text-xs">{e.charterer || e.broker || '—'}</TableCell>
                            <TableCell>
                              {e.status ? (
                                <Badge variant="outline" className={STATUS_COLORS[e.status] || ''}>{e.status}</Badge>
                              ) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Vessel Positions */}
            <TabsContent value="positions" className="mt-4">
              {parsed.vessel_positions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No vessel positions found.</p>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vessel</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Open Port/Region</TableHead>
                          <TableHead>Open Date</TableHead>
                          <TableHead>Last Cargo</TableHead>
                          <TableHead>Owner/Operator</TableHead>
                          <TableHead>Features</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsed.vessel_positions.map((v, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-semibold">{v.vessel_name || '—'}</TableCell>
                            <TableCell><Badge variant="outline">{v.vessel_class || '—'}</Badge></TableCell>
                            <TableCell>{v.open_port || v.open_region || '—'}</TableCell>
                            <TableCell className="text-xs">{v.open_date_raw || '—'}</TableCell>
                            <TableCell className="text-xs">{v.last_cargo || '—'}</TableCell>
                            <TableCell className="text-xs">{v.owner || v.operator || '—'}</TableCell>
                            <TableCell className="text-xs">
                              {v.coated && <Badge variant="secondary" className="mr-1 text-[10px]">Coated</Badge>}
                              {v.heated && <Badge variant="secondary" className="text-[10px]">Heated</Badge>}
                              {!v.coated && !v.heated && (v.notes || '—')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Rate Indications */}
            <TabsContent value="rates" className="mt-4">
              {parsed.rate_indications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No rate indications found.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {parsed.rate_indications.map((r, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-600">{r.route || '—'}</CardTitle>
                        <CardDescription>{r.vessel_class || ''}</CardDescription>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-2 text-xs">
                        {r.rate_ws != null && <div><span className="text-muted-foreground block">WS</span><span className="font-mono font-semibold">{r.rate_ws}</span></div>}
                        {r.rate_lumpsum != null && <div><span className="text-muted-foreground block">Lumpsum</span><span className="font-mono font-semibold">${r.rate_lumpsum.toLocaleString()}</span></div>}
                        {r.tce_usd_day != null && <div><span className="text-muted-foreground block">TCE</span><span className="font-mono font-semibold">${r.tce_usd_day.toLocaleString()}/d</span></div>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Contacts */}
            <TabsContent value="contacts" className="mt-4">
              {parsed.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No contacts found.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {parsed.contacts.map((c, i) => (
                    <Card key={i}>
                      <CardContent className="flex items-center gap-3 py-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {c.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.name || 'Unknown'}</p>
                          {c.role && <Badge variant="outline" className="text-[10px] mt-0.5">{c.role}</Badge>}
                          {c.company && <p className="text-xs text-muted-foreground mt-0.5">{c.company}</p>}
                          {c.phone && <p className="text-xs text-muted-foreground font-mono">{c.phone}</p>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Team Activity */}
            <TabsContent value="activity" className="mt-4">
              {parsed.team_interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No team interactions found.</p>
              ) : (
                <div className="space-y-2">
                  {parsed.team_interactions.map((t, i) => (
                    <Card key={i}>
                      <CardContent className="flex items-start gap-3 py-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {t.sender_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{t.sender_name || '—'}</span>
                            {t.action_type && (
                              <Badge variant="secondary" className={`text-[10px] ${ACTION_COLORS[t.action_type] || ''}`}>
                                {t.action_type}
                              </Badge>
                            )}
                            {t.message_timestamp && <span className="text-xs text-muted-foreground ml-auto">{t.message_timestamp}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{t.summary}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Push to DB */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Save to Database</CardTitle>
              </div>
              <CardDescription>Push extracted data into the CRM database tables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 flex-wrap">
                {(Object.keys(TABLE_MAP) as Array<keyof ParsedResult>).map((key) => {
                  const count = parsed[key];
                  if (!Array.isArray(count) || count.length === 0) return null;
                  const status = insertStatus[key];
                  return (
                    <Button
                      key={key}
                      variant={status === 'success' ? 'outline' : 'secondary'}
                      size="sm"
                      disabled={status === 'inserting' || status === 'success'}
                      onClick={() => handleInsert(key, TABLE_MAP[key])}
                    >
                      {status === 'inserting' && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                      {status === 'success' ? '✓ ' : ''}
                      {(count as unknown[]).length} {key.replace(/_/g, ' ')}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Raw JSON */}
          <Collapsible open={showRaw} onOpenChange={setShowRaw}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                {showRaw ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                View Raw JSON
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-2 rounded-lg border bg-muted/50 p-4 text-xs overflow-auto max-h-96 font-mono">
                {JSON.stringify(parsed, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
