import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmUser } from "@/hooks/useCrmUser";
import { supabase } from "@/lib/supabaseClient";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Activity, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
];

function getPresetRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start: start.toISOString(), end: end.toISOString() };
}

function fmt(val: any, decimals = 0) {
  if (val === null || val === undefined) return "—";
  const n = Number(val);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtPct(val: any) {
  if (val === null || val === undefined) return "—";
  return `${Number(val).toFixed(1)}%`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtHrs(val: any) {
  if (val === null || val === undefined) return "—";
  const h = Number(val);
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

// ─── Shared sub-components ────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading…
    </div>
  );
}

function KpiCard({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn("text-2xl font-bold tabular-nums mt-1", warn ? "text-warning" : "text-foreground")}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MiniBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right tabular-nums text-sm">{fmt(value)}</span>
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const variants: Record<string, string> = {
    COLD_CALLING: "bg-muted text-muted-foreground",
    ASPIRATION: "bg-primary/10 text-primary",
    ACHIEVEMENT: "bg-success/10 text-success",
    INACTIVE: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("text-[10px]", variants[stage])}>
      {stage?.replace("_", " ") || "—"}
    </Badge>
  );
}

function BucketBadge({ bucket }: { bucket: string }) {
  if (!bucket || bucket === "0-30")
    return (
      <Badge variant="outline" className="bg-success/10 text-success text-[10px]">
        {bucket || "0–30d"}
      </Badge>
    );
  if (bucket === "31-60")
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning text-[10px]">
        31–60d
      </Badge>
    );
  if (bucket === "61-90")
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning text-[10px]">
        61–90d
      </Badge>
    );
  if (bucket === "90+")
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px]">
        90d+
      </Badge>
    );
  if (bucket === "never")
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px]">
        Never
      </Badge>
    );
  return <span>{bucket}</span>;
}

// ─── Hook: users list (admin) ─────────────────────────────────────────────

function useUsersList(isAdminFlag: boolean) {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    if (!isAdminFlag) return;
    supabase
      .from("crm_users")
      .select("id, full_name, role")
      .eq("active", true)
      .order("full_name")
      .then(({ data }) => setUsers(data || []));
  }, [isAdminFlag]);
  return users;
}

// ─── REPORT A: Activity ──────────────────────────────────────────────────

function ReportA({ isAdmin: admin }: { isAdmin: boolean }) {
  const users = useUsersList(admin);
  const [preset, setPreset] = useState(30);
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { start, end } = getPresetRange(preset);
    const { data: rows, error: err } = await supabase.rpc("rpc_report_a_activity_summary", {
      p_start: start,
      p_end: end,
      p_user_id: userId === "all" || !userId ? null : userId,
    });
    if (err) setError(err.message);
    else setData(rows || []);
    setLoading(false);
  }, [preset, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data
    ? {
        interactions: data.reduce((s, r) => s + Number(r.total_interactions || 0), 0),
        contacts: data.reduce((s, r) => s + Number(r.unique_contacts_touched || 0), 0),
        tasksComp: data.reduce((s, r) => s + Number(r.tasks_completed || 0), 0),
        tasksDue: data.reduce((s, r) => s + Number(r.tasks_due || 0), 0),
      }
    : null;

  const maxInter = data ? Math.max(...data.map((r) => Number(r.total_interactions || 0)), 1) : 1;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <Select value={String(preset)} onValueChange={(v) => setPreset(Number(v))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((p) => (
              <SelectItem key={p.days} value={String(p.days)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {admin && users.length > 0 && (
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All brokers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brokers</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}

      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard label="Total Interactions" value={fmt(totals.interactions)} />
          <KpiCard label="Unique Contacts" value={fmt(totals.contacts)} />
          <KpiCard label="Tasks Completed" value={fmt(totals.tasksComp)} />
          <KpiCard
            label="Task Completion Rate"
            value={totals.tasksDue === 0 ? "—" : fmtPct((totals.tasksComp / totals.tasksDue) * 100)}
            sub={totals.tasksDue > 0 ? `${fmt(totals.tasksDue)} tasks due` : "No tasks due"}
          />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <Spinner />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broker</TableHead>
                  <TableHead className="text-right">Interactions</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Emails</TableHead>
                  <TableHead className="text-right">WhatsApp</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead className="text-right">Enquiries</TableHead>
                  <TableHead className="text-right">Tasks Due</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data || data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                      No data for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.crm_user_id}>
                      <TableCell>
                        <div className="font-semibold">{row.user_name}</div>
                        <div className="text-xs text-muted-foreground">{row.user_role}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <MiniBar value={Number(row.total_interactions || 0)} max={maxInter} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(row.calls_made)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(row.emails_sent)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(row.whatsapp_sent)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(row.unique_contacts_touched)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(row.enquiries_handled)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(row.tasks_due)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(row.tasks_completed)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={row.task_completion_rate >= 80 ? "text-success" : "text-warning"}>
                          {fmtPct(row.task_completion_rate)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── REPORT B: Coverage ──────────────────────────────────────────────────

function ReportB({ isAdmin: admin }: { isAdmin: boolean }) {
  const users = useUsersList(admin);
  const [ownerId, setOwnerId] = useState("");
  const [stage, setStage] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase.rpc("rpc_report_b_coverage", {
      p_owner_id: ownerId === "all" || !ownerId ? null : ownerId,
      p_stage: stage === "all" || !stage ? null : stage,
      p_company_id: null,
    });
    if (err) setError(err.message);
    else setData(rows?.[0] || null);
    setLoading(false);
  }, [ownerId, stage]);

  useEffect(() => {
    load();
  }, [load]);

  const d = data;
  const total = d ? Number(d.total_active_contacts) : 0;

  const STAGES = [
    { key: "stage_cold_calling", label: "Cold Calling", color: "bg-muted-foreground" },
    { key: "stage_aspiration", label: "Aspiration", color: "bg-primary" },
    { key: "stage_achievement", label: "Achievement", color: "bg-success" },
    { key: "stage_inactive", label: "Inactive", color: "bg-muted-foreground/50" },
  ];
  const stageMax = d ? Math.max(...STAGES.map((s) => Number(d[s.key] || 0)), 1) : 1;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {admin && users.length > 0 && (
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All owners</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            <SelectItem value="COLD_CALLING">Cold Calling</SelectItem>
            <SelectItem value="ASPIRATION">Aspiration</SelectItem>
            <SelectItem value="ACHIEVEMENT">Achievement</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : !d ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Total Active Contacts" value={fmt(d.total_active_contacts)} />
            <KpiCard
              label="Assigned (Primary)"
              value={fmt(d.assigned_contacts)}
              sub={`${fmtPct(d.assigned_pct)} of total`}
            />
            <KpiCard label="Unassigned" value={fmt(d.unassigned_contacts)} warn={Number(d.unassigned_contacts) > 0} />
            <KpiCard label="Never Contacted" value={fmt(d.never_contacted)} warn={Number(d.never_contacted) > 0} />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">Stage Distribution</h3>
                <div className="space-y-4">
                  {STAGES.map((s) => (
                    <div key={s.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {fmt(d[s.key])} ({total > 0 ? ((d[s.key] / total) * 100).toFixed(0) : 0}%)
                        </span>
                      </div>
                      <div className="h-2.5 bg-border rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", s.color)}
                          style={{ width: `${(d[s.key] / stageMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div className="px-5 pt-5 pb-2">
                  <h3 className="text-sm font-bold text-foreground">Inactivity Buckets</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Threshold</TableHead>
                      <TableHead className="text-right">Contacts</TableHead>
                      <TableHead className="text-right">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { label: "Not touched 30d+", val: d.not_touched_30d, warn: false },
                      { label: "Not touched 60d+", val: d.not_touched_60d, warn: Number(d.not_touched_60d) > 0 },
                      { label: "Not touched 90d+", val: d.not_touched_90d, warn: Number(d.not_touched_90d) > 0 },
                      { label: "Never contacted", val: d.never_contacted, warn: Number(d.never_contacted) > 0 },
                    ].map((row) => (
                      <TableRow key={row.label}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", row.warn && "text-warning font-bold")}>
                          {fmt(row.val)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {total > 0 ? `${((Number(row.val) / total) * 100).toFixed(1)}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ─── REPORT C: Pipeline ──────────────────────────────────────────────────

function ReportC() {
  const [preset, setPreset] = useState(30);
  const [pipeline, setPipeline] = useState<any | null>(null);
  const [respStats, setRespStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { start, end } = getPresetRange(preset);
    const [p, r] = await Promise.all([
      supabase.rpc("rpc_report_c_pipeline", { p_start: start, p_end: end, p_mode: null }),
      supabase.rpc("rpc_report_c_response_stats", { p_start: start, p_end: end }),
    ]);
    if (p.error) {
      setError(p.error.message);
      setLoading(false);
      return;
    }
    if (r.error) {
      setError(r.error.message);
      setLoading(false);
      return;
    }
    setPipeline(p.data?.[0] || null);
    setRespStats(r.data?.[0] || null);
    setLoading(false);
  }, [preset]);

  useEffect(() => {
    load();
  }, [load]);

  const pl = pipeline;
  const rs = respStats;

  const statusRows = pl
    ? [
        { label: "Received", val: pl.status_received, color: "bg-muted-foreground" },
        { label: "Screening", val: pl.status_screening, color: "bg-primary/70" },
        { label: "In Market", val: pl.status_in_market, color: "bg-primary" },
        { label: "Offer Out", val: pl.status_offer_out, color: "bg-purple-500" },
        { label: "Countering", val: pl.status_countering, color: "bg-fuchsia-500" },
        { label: "Subjects", val: pl.status_subjects, color: "bg-warning" },
        { label: "Fixed", val: pl.status_fixed, color: "bg-success" },
        { label: "Failed", val: pl.status_failed, color: "bg-destructive" },
        { label: "Cancelled", val: pl.status_cancelled, color: "bg-muted-foreground/50" },
        { label: "Withdrawn", val: pl.status_withdrawn, color: "bg-muted-foreground/50" },
      ]
    : [];
  const maxStatus = statusRows.reduce((m, r) => Math.max(m, Number(r.val || 0)), 1);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <Select value={String(preset)} onValueChange={(v) => setPreset(Number(v))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((p) => (
              <SelectItem key={p.days} value={String(p.days)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}
      {loading ? (
        <Spinner />
      ) : !pl && !rs ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Total Enquiries" value={fmt(pl?.total_enquiries)} />
            <KpiCard label="Open / Active" value={fmt(pl?.open_active)} />
            <KpiCard label="Won (Fixed)" value={fmt(pl?.closed_won)} />
            <KpiCard label="Lost" value={fmt(pl?.closed_lost)} warn={Number(pl?.closed_lost) > 0} />
            <KpiCard
              label="Win Rate"
              value={fmtPct(pl?.win_rate_pct)}
              sub={`${fmt(pl?.closed_won)} won / ${fmt(Number(pl?.closed_won || 0) + Number(pl?.closed_lost || 0))} resolved`}
            />
            <KpiCard
              label="Responses"
              value={fmt(rs?.total_responses)}
              sub={`Avg ${rs?.avg_responses_per_enquiry ? Number(rs.avg_responses_per_enquiry).toFixed(1) : "—"} per enquiry`}
            />
            <KpiCard
              label="Shortlisted"
              value={fmt(rs?.total_shortlisted)}
              sub={`${fmt(rs?.enquiries_with_shortlist)} enquiries`}
            />
            <KpiCard label="Conversion Proxy" value={fmt(rs?.conversion_proxy)} sub="Won with shortlist" />
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">Pipeline by Status</h3>
                <div className="space-y-3">
                  {statusRows.map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-muted-foreground tabular-nums">{fmt(r.val)}</span>
                      </div>
                      <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", r.color)}
                          style={{ width: `${(Number(r.val || 0) / maxStatus) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4">Response Speed</h3>
                <div className="space-y-4">
                  {[
                    { label: "Median time to first response", val: fmtHrs(rs?.median_time_to_first_resp_hrs) },
                    { label: "Fastest response", val: fmtHrs(rs?.fastest_response_hrs) },
                    { label: "Slowest response", val: fmtHrs(rs?.slowest_response_hrs) },
                    {
                      label: "Enquiries with no response",
                      val: fmt(rs?.enquiries_no_response),
                      warn: Number(rs?.enquiries_no_response) > 0,
                    },
                    {
                      label: "Data errors excluded",
                      val: fmt(rs?.excluded_negative_response),
                      warn: Number(rs?.excluded_negative_response) > 0,
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span
                        className={cn("font-bold tabular-nums", (row as any).warn ? "text-warning" : "text-foreground")}
                      >
                        {row.val}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ─── REPORT D: Interaction Gaps ──────────────────────────────────────────

function ReportD({ isAdmin: admin }: { isAdmin: boolean }) {
  const users = useUsersList(admin);
  const [ownerId, setOwnerId] = useState("");
  const [bucket, setBucket] = useState("");
  const [stage, setStage] = useState("");
  const [hasTask, setHasTask] = useState("");
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: rows, error: err } = await supabase.rpc("rpc_report_d_gap_list", {
      p_owner_id: ownerId === "all" || !ownerId ? null : ownerId,
      p_bucket: bucket === "all" || !bucket ? null : bucket,
      p_stage: stage === "all" || !stage ? null : stage,
      p_company_id: null,
    });
    if (err) setError(err.message);
    else {
      let filtered = rows || [];
      if (hasTask === "yes") filtered = filtered.filter((r: any) => Number(r.open_tasks_count) > 0);
      if (hasTask === "no") filtered = filtered.filter((r: any) => Number(r.open_tasks_count) === 0);
      setData(filtered);
    }
    setLoading(false);
  }, [ownerId, bucket, stage, hasTask]);

  useEffect(() => {
    load();
  }, [load]);

  const bucketCounts = data
    ? {
        "0-30": data.filter((r) => r.inactivity_bucket === "0-30").length,
        "31-60": data.filter((r) => r.inactivity_bucket === "31-60").length,
        "61-90": data.filter((r) => r.inactivity_bucket === "61-90").length,
        "90+": data.filter((r) => r.inactivity_bucket === "90+").length,
        never: data.filter((r) => r.inactivity_bucket === "never").length,
        hvGap: data.filter((r) => r.is_high_value_gap).length,
      }
    : null;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {admin && users.length > 0 && (
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All owners" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={bucket} onValueChange={setBucket}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All buckets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All buckets</SelectItem>
            <SelectItem value="0-30">0–30 days</SelectItem>
            <SelectItem value="31-60">31–60 days</SelectItem>
            <SelectItem value="61-90">61–90 days</SelectItem>
            <SelectItem value="90+">90+ days</SelectItem>
            <SelectItem value="never">Never contacted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            <SelectItem value="COLD_CALLING">Cold Calling</SelectItem>
            <SelectItem value="ASPIRATION">Aspiration</SelectItem>
            <SelectItem value="ACHIEVEMENT">Achievement</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={hasTask} onValueChange={setHasTask}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All (tasks)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All (tasks)</SelectItem>
            <SelectItem value="yes">Has open task</SelectItem>
            <SelectItem value="no">No open task</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
          {error}
        </div>
      )}

      {bucketCounts && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <KpiCard label="0–30 Days Silent" value={fmt(bucketCounts["0-30"])} />
          <KpiCard label="31–60 Days Silent" value={fmt(bucketCounts["31-60"])} warn={bucketCounts["31-60"] > 0} />
          <KpiCard label="61–90 Days Silent" value={fmt(bucketCounts["61-90"])} warn={bucketCounts["61-90"] > 0} />
          <KpiCard label="90+ Days Silent" value={fmt(bucketCounts["90+"])} warn={bucketCounts["90+"] > 0} />
          <KpiCard label="Never Contacted" value={fmt(bucketCounts.never)} warn={bucketCounts.never > 0} />
          <KpiCard
            label="⚠ High-Value Gaps"
            value={fmt(bucketCounts.hvGap)}
            warn={bucketCounts.hvGap > 0}
            sub="Aspiration/Achievement 30d+"
          />
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
            <span className="text-sm font-bold text-foreground">
              Contact Gap List{data ? ` — ${data.length} contacts` : ""}
            </span>
            {data && data.filter((r) => r.is_high_value_gap).length > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning text-[10px]">
                {data.filter((r) => r.is_high_value_gap).length} high-value gaps
              </Badge>
            )}
          </div>
          {loading ? (
            <Spinner />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Last Contacted</TableHead>
                    <TableHead className="text-right">Days Silent</TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead className="text-right">Open Tasks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!data || data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                        No contacts match these filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.map((row) => (
                      <TableRow
                        key={row.contact_id}
                        className={cn(row.is_high_value_gap && "bg-warning/5 border-l-2 border-l-warning")}
                      >
                        <TableCell>
                          <span className="font-semibold">{row.full_name}</span>
                          {row.is_high_value_gap && (
                            <span className="ml-1.5 text-[11px] text-warning">⚠ High-value</span>
                          )}
                        </TableCell>
                        <TableCell>{row.company_name || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          <StageBadge stage={row.stage} />
                        </TableCell>
                        <TableCell>
                          {row.primary_owner_name || <span className="text-muted-foreground italic">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fmtDate(row.last_interaction_at)}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums font-bold",
                            row.days_silent === null
                              ? "text-destructive"
                              : row.days_silent > 90
                                ? "text-destructive"
                                : row.days_silent > 30
                                  ? "text-warning"
                                  : "text-foreground",
                          )}
                        >
                          {row.days_silent === null ? "∞" : row.days_silent}
                        </TableCell>
                        <TableCell>
                          <BucketBadge bucket={row.inactivity_bucket} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(row.open_tasks_count) > 0 ? (
                            <span className="text-success font-semibold">{row.open_tasks_count}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Reporting Page ─────────────────────────────────────────────────

export default function Reporting() {
  const { isAdmin: admin, crmUser } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reporting</h1>
        <p className="mt-1 text-muted-foreground">Analytics and performance reports</p>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Activity
          </TabsTrigger>
          <TabsTrigger value="coverage" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Coverage
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="gaps" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Interaction Gaps
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Activity Reporting</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Broker productivity — interactions, contacts touched, tasks, and enquiries handled.
          </p>
          <ReportA isAdmin={admin} />
        </TabsContent>

        <TabsContent value="coverage" className="mt-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Contact Coverage</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Database health snapshot — assignment status, stage distribution, and inactivity.
          </p>
          <ReportB isAdmin={admin} />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Enquiry Pipeline</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Deal flow — open vs closed, responses received, shortlists, and time-to-first-response.
          </p>
          <ReportC />
        </TabsContent>

        <TabsContent value="gaps" className="mt-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Interaction Gaps</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Contacts going cold — sorted by inactivity, with high-value gaps highlighted.
          </p>
          <ReportD isAdmin={admin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
