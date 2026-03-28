import { supabase } from "@/lib/supabaseClient";

// ---------- Types ----------

export interface MarketRecord {
  id: string;
  report_source: string;
  report_date: string;
  report_type: string | null;
  record_type: string | null;
  source_broker: string | null;
  // Fixture / Enquiry fields
  vessel_name: string | null;
  vessel_class: string | null;
  dwt: number | null;
  built_year: number | null;
  owner: string | null;
  charterer: string | null;
  cargo_grade: string | null;
  cargo_type: string | null;
  quantity_mt: number | null;
  load_port: string | null;
  load_region: string | null;
  discharge_port: string | null;
  discharge_region: string | null;
  laycan_from: string | null;
  laycan_to: string | null;
  rate_type: string | null;
  rate_value: string | null;
  rate_numeric: number | null;
  fixture_status: string | null;
  broker: string | null;
  coating: string | null;
  raw_text: string | null;
  confidence: number | null;
  pdf_filename: string | null;
  // Baltic fields
  baltic_route: string | null;
  baltic_description: string | null;
  baltic_size: string | null;
  world_scale: number | null;
  tc_earnings: number | null;
  // Bunker fields
  bunker_region: string | null;
  vlsfo_price: number | null;
  vlsfo_change: number | null;
  ifo380_price: number | null;
  ifo380_change: number | null;
  mgo_price: number | null;
  mgo_change: number | null;
  // Meta
  created_at: string;
}

// Backward compat alias
export type MarketFixture = MarketRecord;

const ALL_COLUMNS = `id, report_source, report_date, report_type, record_type, source_broker,
  vessel_name, vessel_class, dwt, built_year, owner, charterer, cargo_grade, cargo_type,
  quantity_mt, load_port, load_region, discharge_port, discharge_region,
  laycan_from, laycan_to, rate_type, rate_value, rate_numeric, fixture_status,
  broker, coating, raw_text, confidence, pdf_filename,
  baltic_route, baltic_description, baltic_size, world_scale, tc_earnings,
  bunker_region, vlsfo_price, vlsfo_change, ifo380_price, ifo380_change, mgo_price, mgo_change,
  created_at`;

// ---------- Fetch ----------

export async function fetchMarketData(filters?: {
  dateFrom?: string;
  dateTo?: string;
  reportType?: string;
}): Promise<{
  data: MarketRecord[] | null;
  error: string | null;
}> {
  try {
    let query = supabase
      .from("market_data")
      .select(ALL_COLUMNS)
      .order("report_date", { ascending: false })
      .order("vessel_class", { ascending: true })
      .order("created_at", { ascending: false });

    if (filters?.dateFrom) query = query.gte("report_date", filters.dateFrom);
    if (filters?.dateTo) query = query.lte("report_date", filters.dateTo);
    if (filters?.reportType) query = query.eq("report_type", filters.reportType);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: data as MarketRecord[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function fetchAvailableDates(): Promise<{
  data: string[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("market_data")
      .select("report_date")
      .order("report_date", { ascending: false })
      .limit(60);
    if (error) return { data: null, error: error.message };
    const unique = [...new Set((data ?? []).map((r) => r.report_date))];
    return { data: unique, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ---------- Report history ----------

export interface ReportSummary {
  report_source: string;
  fixture_count: number;
  upload_count: number;
  latest_report_date: string;
  latest_uploaded_at: string;
  filenames: string[];
}

export async function fetchReportHistory(): Promise<{
  data: ReportSummary[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("market_data")
      .select("report_source, pdf_filename, report_date, created_at")
      .order("created_at", { ascending: false });
    if (error) return { data: null, error: error.message };

    const map = new Map<string, ReportSummary>();
    const uploadTracker = new Map<string, Set<string>>();

    for (const row of data ?? []) {
      const src = row.report_source;
      const uploadKey = `${row.pdf_filename ?? ""}|${row.report_date}`;
      const existing = map.get(src);
      if (existing) {
        existing.fixture_count++;
        if (row.created_at > existing.latest_uploaded_at) existing.latest_uploaded_at = row.created_at;
        if (row.report_date > existing.latest_report_date) existing.latest_report_date = row.report_date;
        if (row.pdf_filename && !existing.filenames.includes(row.pdf_filename)) existing.filenames.push(row.pdf_filename);
        uploadTracker.get(src)!.add(uploadKey);
      } else {
        map.set(src, {
          report_source: src,
          fixture_count: 1,
          upload_count: 1,
          latest_report_date: row.report_date,
          latest_uploaded_at: row.created_at,
          filenames: row.pdf_filename ? [row.pdf_filename] : [],
        });
        uploadTracker.set(src, new Set([uploadKey]));
      }
    }
    for (const [src, summary] of map) {
      summary.upload_count = uploadTracker.get(src)?.size ?? 1;
    }
    return { data: [...map.values()], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ---------- Upload ----------

export async function uploadMarketReport(
  file: File,
  uploadedBy: string | null
): Promise<{
  inserted: number;
  skipped: number;
  reportSource: string | null;
  reportDate: string | null;
  reportType: string | null;
  counts: { baltic: number; fixtures: number; enquiries: number; bunker: number } | null;
  error: string | null;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
    const base64 = btoa(binary);

    const { data, error } = await supabase.functions.invoke(
      "parse-market-report",
      { body: { file_base64: base64, file_name: file.name, uploaded_by: uploadedBy } }
    );

    if (error) {
      return { inserted: 0, skipped: 0, reportSource: null, reportDate: null, reportType: null, counts: null, error: error.message ?? "Upload failed" };
    }

    return {
      inserted: data?.inserted ?? 0,
      skipped: data?.skipped ?? 0,
      reportSource: data?.report_source ?? null,
      reportDate: data?.report_date ?? null,
      reportType: data?.report_type ?? null,
      counts: data?.counts ?? null,
      error: null,
    };
  } catch (err) {
    return { inserted: 0, skipped: 0, reportSource: null, reportDate: null, reportType: null, counts: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ---------- Resolutions ----------

export interface Resolution {
  id: string;
  vessel_name: string;
  report_date: string;
  field_name: string;
  resolved_value: string | null;
  remark: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  created_at: string;
}

export async function fetchResolutions(): Promise<{
  data: Resolution[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("market_data_resolutions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data as Resolution[], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function resolveDiscrepancy(params: {
  vesselName: string;
  reportDate: string;
  fieldName: string;
  resolvedValue: string | null;
  remark: string;
  resolvedBy: string | null;
  resolvedByName: string;
}): Promise<{ error: string | null }> {
  try {
    const { data: existing } = await supabase
      .from("market_data_resolutions")
      .select("id")
      .eq("vessel_name", params.vesselName)
      .eq("report_date", params.reportDate)
      .eq("field_name", params.fieldName)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from("market_data_resolutions")
        .update({
          resolved_value: params.resolvedValue,
          remark: params.remark,
          resolved_by: params.resolvedBy,
          resolved_by_name: params.resolvedByName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from("market_data_resolutions")
        .insert({
          vessel_name: params.vesselName,
          report_date: params.reportDate,
          field_name: params.fieldName,
          resolved_value: params.resolvedValue,
          remark: params.remark,
          resolved_by: params.resolvedBy,
          resolved_by_name: params.resolvedByName,
        });
      if (error) return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
