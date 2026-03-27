import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseClient";

export interface MarketFixture {
  id: string;
  report_source: string;
  report_date: string;
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
  confidence: number | null;
  pdf_filename: string | null;
  created_at: string;
}

export async function fetchMarketData(date: string): Promise<{
  data: MarketFixture[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("market_data")
      .select(
        "id, report_source, report_date, vessel_name, vessel_class, dwt, built_year, owner, charterer, cargo_grade, cargo_type, quantity_mt, load_port, load_region, discharge_port, discharge_region, laycan_from, laycan_to, rate_type, rate_value, rate_numeric, fixture_status, broker, confidence, pdf_filename, created_at"
      )
      .eq("report_date", date)
      .order("vessel_class", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data as MarketFixture[], error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
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
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function uploadMarketReport(
  file: File,
  reportSource: string,
  reportDate: string,
  uploadedBy: string | null
): Promise<{ inserted: number; error: string | null }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("report_source", reportSource);
    formData.append("report_date", reportDate);
    if (uploadedBy) formData.append("uploaded_by", uploadedBy);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token ?? SUPABASE_ANON_KEY;

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/parse-market-report`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: formData,
      }
    );

    const json = await res.json();
    if (!res.ok) return { inserted: 0, error: json.error ?? "Upload failed" };
    return { inserted: json.inserted ?? 0, error: null };
  } catch (err) {
    return {
      inserted: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
