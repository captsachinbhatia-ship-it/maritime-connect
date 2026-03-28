// supabase/functions/parse-market-report/index.ts
// Accepts a PDF upload, extracts fixture rows via Claude API,
// and inserts structured rows into market_data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ---------- Types ----------

interface FixtureRow {
  vessel_name: string | null;
  vessel_class: string | null;
  dwt: number | null;
  built_year: number | null;
  flag: string | null;
  owner: string | null;
  charterer: string | null;
  cargo_grade: string | null;
  cargo_type: string | null;
  quantity_mt: number | null;
  quantity_cbm: number | null;
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
  raw_text: string | null;
}

interface ClaudeExtractionResponse {
  fixtures: FixtureRow[];
}

// ---------- Claude extraction ----------

const EXTRACTION_PROMPT = `You are a maritime fixture data extraction engine.

You will receive the text content of a daily tanker broker report (one of: Meiwa VLCC, Meiwa Dirty, Presco, Gibson, Vantage DPP).

Extract EVERY fixture and enquiry row into structured JSON. Each row represents one vessel fixture or market enquiry.

Return a JSON object with a single key "fixtures" containing an array of objects. Each object must have these fields (use null for missing values):

- vessel_name: string — vessel name (e.g. "FRONT DEFENDER")
- vessel_class: string — one of: VLCC, Suezmax, Aframax, MR, LR1, LR2 (infer from DWT or report section if not explicit)
- dwt: number — deadweight tonnage
- built_year: number — year built
- flag: string — vessel flag state
- owner: string — vessel owner/operator
- charterer: string — chartering company
- cargo_grade: string — specific cargo (e.g. "Arabian Light", "Naphtha", "Fuel Oil 380")
- cargo_type: string — one of: Crude, CPP, DPP, Chemical, LPG
- quantity_mt: number — cargo quantity in metric tons
- quantity_cbm: number — cargo quantity in cubic meters
- load_port: string — loading port
- load_region: string — one of: AG, WAF, USG, UKC, MED, FE, SA, CARIBS, ECSA, WAFR, EAFR, BSea, Baltic
- discharge_port: string — discharge port
- discharge_region: string — same region codes as load_region
- laycan_from: string — laycan start date in YYYY-MM-DD format
- laycan_to: string — laycan end date in YYYY-MM-DD format
- rate_type: string — one of: WS, lumpsum, per_mt, tce
- rate_value: string — the rate as stated in the report (e.g. "WS 72", "$850k", "$28/MT")
- rate_numeric: number — parsed numeric value (WS points as integer, USD amounts in full, e.g. 850000 not 850k)
- fixture_status: string — one of: reported, fixed, on_subs, failed, withdrawn
- broker: string — broker name if mentioned
- confidence: number — your confidence in the extraction accuracy (0.0 to 1.0)
- raw_text: string — the original line(s) from the report for this fixture

Vessel class inference rules:
- VLCC: 200,000+ DWT
- Suezmax: 120,000–199,999 DWT
- Aframax: 80,000–119,999 DWT
- LR2: 80,000–119,999 DWT (clean/CPP cargo)
- LR1: 55,000–79,999 DWT (clean/CPP cargo)
- MR: 25,000–54,999 DWT

Date inference: If the report only says "5/4" or "Apr 5", interpret relative to the report date provided. Convert to YYYY-MM-DD.

Respond with ONLY valid JSON, no markdown fences, no commentary.`;

async function extractFixturesFromPdf(
  pdfBase64: string,
  reportSource: string,
  reportDate: string
): Promise<ClaudeExtractionResponse> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: `This is a "${reportSource}" broker report dated ${reportDate}.\n\n${EXTRACTION_PROMPT}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Claude API error ${response.status}: ${errorBody}`
    );
  }

  const result = await response.json();
  const text = result.content?.[0]?.text ?? "";

  // Strip markdown fences if Claude added them despite instructions
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  return JSON.parse(cleaned) as ClaudeExtractionResponse;
}

// ---------- Handler ----------

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Support both JSON (from supabase.functions.invoke) and form data
    const contentType = req.headers.get("content-type") ?? "";
    let base64: string;
    let reportSource: string;
    let reportDate: string;
    let uploadedBy: string | null;
    let fileName: string;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      base64 = body.file_base64;
      reportSource = body.report_source ?? "unknown";
      reportDate = body.report_date ?? new Date().toISOString().slice(0, 10);
      uploadedBy = body.uploaded_by ?? null;
      fileName = body.file_name ?? "upload.pdf";

      if (!base64) {
        return new Response(
          JSON.stringify({ error: "file_base64 is required" }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      reportSource = (formData.get("report_source") as string) ?? "unknown";
      reportDate =
        (formData.get("report_date") as string) ??
        new Date().toISOString().slice(0, 10);
      uploadedBy = formData.get("uploaded_by") as string | null;

      if (!file || file.type !== "application/pdf") {
        return new Response(
          JSON.stringify({ error: "A PDF file is required" }),
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }

      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      base64 = btoa(String.fromCharCode(...uint8));
    }

    // Extract fixtures via Claude
    const extraction = await extractFixturesFromPdf(
      base64,
      reportSource,
      reportDate
    );

    if (!extraction.fixtures || extraction.fixtures.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          inserted: 0,
          message: "No fixtures found in the report",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Build insert rows
    const rows = extraction.fixtures.map((f) => ({
      report_source: reportSource,
      report_date: reportDate,
      raw_text: f.raw_text,
      vessel_name: f.vessel_name,
      vessel_class: f.vessel_class,
      dwt: f.dwt,
      built_year: f.built_year,
      flag: f.flag,
      owner: f.owner,
      charterer: f.charterer,
      cargo_grade: f.cargo_grade,
      cargo_type: f.cargo_type,
      quantity_mt: f.quantity_mt,
      quantity_cbm: f.quantity_cbm,
      load_port: f.load_port,
      load_region: f.load_region,
      discharge_port: f.discharge_port,
      discharge_region: f.discharge_region,
      laycan_from: f.laycan_from,
      laycan_to: f.laycan_to,
      rate_type: f.rate_type,
      rate_value: f.rate_value,
      rate_numeric: f.rate_numeric,
      fixture_status: f.fixture_status ?? "reported",
      broker: f.broker,
      confidence: f.confidence,
      uploaded_by: uploadedBy,
      pdf_filename: fileName,
    }));

    // Insert into market_data (service_role bypasses RLS)
    const { data, error } = await supabaseUser
      .from("market_data")
      .insert(rows)
      .select("id");

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: data?.length ?? 0,
        fixtures: extraction.fixtures.length,
        sample: extraction.fixtures.slice(0, 3),
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("parse-market-report error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
