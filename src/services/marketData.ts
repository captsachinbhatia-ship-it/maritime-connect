import { supabase } from "@/lib/supabaseClient";

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
  uploadedBy: string | null
): Promise<{
  inserted: number;
  skipped: number;
  reportSource: string | null;
  reportDate: string | null;
  error: string | null;
}> {
  try {
    // Read file as base64 to send via JSON (avoids multipart CORS issues)
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    const { data, error } = await supabase.functions.invoke(
      "parse-market-report",
      {
        body: {
          file_base64: base64,
          file_name: file.name,
          uploaded_by: uploadedBy,
        },
      }
    );

    if (error) {
      return {
        inserted: 0,
        skipped: 0,
        reportSource: null,
        reportDate: null,
        error: error.message ?? "Upload failed",
      };
    }

    return {
      inserted: data?.inserted ?? 0,
      skipped: data?.skipped ?? 0,
      reportSource: data?.report_source ?? null,
      reportDate: data?.report_date ?? null,
      error: null,
    };
  } catch (err) {
    return {
      inserted: 0,
      skipped: 0,
      reportSource: null,
      reportDate: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
