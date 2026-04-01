import { supabase } from "@/lib/supabaseClient";

export interface VesselPosition {
  id: string;
  report_date: string;
  source_name: string | null;
  source_email: string | null;
  email_subject: string | null;
  thread_id: string | null;
  import_method: string | null;
  imported_by: string | null;
  vessel_name: string;
  imo: string | null;
  vessel_class: string | null;
  cargo_type: string | null;
  dwt: number | null;
  cbm: number | null;
  built_year: number | null;
  flag: string | null;
  owner: string | null;
  operator: string | null;
  manager: string | null;
  open_port: string | null;
  open_region: string | null;
  open_date: string | null;
  open_date_text: string | null;
  direction: string | null;
  direction_region: string | null;
  last_cargo_1: string | null;
  last_cargo_2: string | null;
  last_cargo_3: string | null;
  cargo_history: string | null;
  coating: string | null;
  ice_class: string | null;
  imo_class: string | null;
  heating: boolean | null;
  nitrogen: boolean | null;
  sire_date: string | null;
  cap_rating: string | null;
  status: string | null;
  comments: string | null;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface PositionFilters {
  vessel_class?: string;
  open_region?: string;
  source_name?: string;
  status?: string;
  search?: string;
  report_date?: string;
}

export async function fetchPositions(filters: PositionFilters = {}): Promise<VesselPosition[]> {
  let query = supabase
    .from("vessel_position_list")
    .select("*")
    .order("report_date", { ascending: false })
    .order("vessel_class")
    .order("vessel_name");

  if (filters.report_date) {
    query = query.eq("report_date", filters.report_date);
  }
  if (filters.vessel_class) {
    query = query.eq("vessel_class", filters.vessel_class);
  }
  if (filters.open_region) {
    query = query.eq("open_region", filters.open_region);
  }
  if (filters.source_name) {
    query = query.eq("source_name", filters.source_name);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.search) {
    query = query.ilike("vessel_name", `%${filters.search}%`);
  }

  const { data, error } = await query.limit(500);
  if (error) throw error;
  return (data ?? []) as VesselPosition[];
}

export async function fetchPositionDates(): Promise<string[]> {
  const { data, error } = await supabase
    .from("vessel_position_list")
    .select("report_date")
    .order("report_date", { ascending: false })
    .limit(30);

  if (error) throw error;
  const unique = [...new Set((data ?? []).map((r) => r.report_date))];
  return unique;
}

export async function fetchPositionStats(reportDate?: string) {
  let query = supabase.from("vessel_position_list").select("vessel_class, open_region, status, source_name");
  if (reportDate) query = query.eq("report_date", reportDate);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  return {
    total: rows.length,
    byClass: countBy(rows, "vessel_class"),
    byRegion: countBy(rows, "open_region"),
    bySource: countBy(rows, "source_name"),
    byStatus: countBy(rows, "status"),
  };
}

function countBy(rows: Record<string, unknown>[], key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const v = String(r[key] ?? "Unknown");
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

export async function insertPosition(position: Partial<VesselPosition>): Promise<void> {
  const { error } = await supabase.from("vessel_position_list").insert(position);
  if (error) throw error;
}

export async function deletePosition(id: string): Promise<void> {
  const { error } = await supabase.from("vessel_position_list").delete().eq("id", id);
  if (error) throw error;
}

export async function triggerPositionScan(): Promise<{ success: boolean; result: unknown }> {
  const { data, error } = await supabase.functions.invoke("trigger-position-scan", {
    body: { trigger: "crm_scan_now" },
  });
  if (error) throw error;
  return data;
}
