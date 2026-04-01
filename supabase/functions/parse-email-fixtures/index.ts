// supabase/functions/parse-email-fixtures/index.ts
// Accepts fixture report email body text, extracts fixtures via Claude,
// and inserts into market_data table. Called by Gmail Apps Script auto-scanner.

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
  segment: string | null;
  charterer: string | null;
  qty: number | null;
  cargo: string | null;
  laycan: string | null;
  load_port: string | null;
  discharge_port: string | null;
  vessel: string | null;
  rate: string | null;
  status: string | null;
  dwt: number | null;
  built_year: number | null;
  owner: string | null;
  coating: string | null;
  confidence: number | null;
  raw_text: string | null;
}

interface EnquiryRow {
  segment: string | null;
  charterer: string | null;
  qty: number | null;
  cargo: string | null;
  laycan: string | null;
  load_port: string | null;
  discharge_port: string | null;
  confidence: number | null;
  raw_text: string | null;
}

interface ClaudeFixtureResponse {
  report_source: string;
  report_date: string;
  report_type: string;
  fixtures: FixtureRow[];
  enquiries: EnquiryRow[];
}

// ---------- Claude extraction prompt ----------

const EMAIL_FIXTURE_PROMPT = `You are a maritime broker fixture report extraction engine.

You will receive the plain text body of a daily fixture report email from a broker
(Aramaritime, GB Line, Optima, Italia Canda, Byzantium, BK Shipping, SBS Tanker,
Riverlake, Fearnleys, or other tanker brokers).

Extract ALL fixtures and enquiries into structured JSON.

Return:
{
  "report_source": "broker_name" (infer from email signature/header/footer),
  "report_date": "YYYY-MM-DD" (current year is 2026),
  "report_type": "DPP" or "CPP",
  "fixtures": [
    {
      "segment": "VLCC",
      "charterer": "VITOL",
      "qty": 270,
      "cargo": "NHC",
      "laycan": "28-30/Mar",
      "load_port": "MEG",
      "discharge_port": "EAST",
      "vessel": "DHT JAGUAR",
      "rate": "W54.25",
      "status": "SUBS",
      "dwt": null,
      "built_year": null,
      "owner": null,
      "coating": null,
      "confidence": 0.95,
      "raw_text": "original line"
    }
  ],
  "enquiries": [
    {
      "segment": "MR",
      "charterer": "BP",
      "qty": 35,
      "cargo": "CPP",
      "laycan": "01-Apr",
      "load_port": "SINGAPORE",
      "discharge_port": "AUSTRALIA",
      "confidence": 0.9,
      "raw_text": "original line"
    }
  ]
}

Field rules:
- segment: VLCC, ULCC, Suezmax, Aframax, Panamax, LR2, LR1, MR, Handy, Chemical, VLGC
  Infer from DWT: VLCC 200k+, Suezmax 120-199k, Aframax 80-119k, LR1 55-79k, MR 25-54k, Handy <25k
- rate: store EXACTLY as shown — "W54.25", "WS467", "$3.2M", "RNR"
- status: SUBS, FXD, FLD, RPTD, WDRN (as in report)
- qty: in thousands of MT (270 = 270,000 MT)
- laycan: keep original text
- confidence: 0.0-1.0 per row

Respond with ONLY valid JSON, no markdown fences, no commentary.`;

// ---------- Status normalizer ----------

function normalizeStatus(s: string | null): string {
  if (!s) return "reported";
  const u = s.toUpperCase().trim();
  if (u === "SUBS" || u === "ON SUBS" || u === "O/S") return "on_subs";
  if (u === "FXD" || u === "FIXED" || u === "DONE") return "fixed";
  if (u === "FLD" || u === "FAILED") return "failed";
  if (u === "WDRN" || u === "WITHDRAWN") return "withdrawn";
  return "reported";
}

// ---------- Handler ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const emailText: string = body.email_text;
    const senderHint: string | null = body.sender_hint ?? null;
    const uploadedBy: string | null = body.uploaded_by ?? null;
    const selectedIds: string | null = body.selected_ids ?? null;
    const emailSubject: string | null = body.email_subject ?? null;
    const emailDate: string | null = body.email_date ?? null;
    const threadId: string | null = body.thread_id ?? null;

    if (!emailText || emailText.length < 30) {
      return new Response(
        JSON.stringify({ error: "email_text is required (min 30 chars)" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Call Claude to extract fixtures
    const promptWithContext = senderHint
      ? `${EMAIL_FIXTURE_PROMPT}\n\nSender hint: ${senderHint}\nEmail subject: ${emailSubject ?? "unknown"}`
      : EMAIL_FIXTURE_PROMPT;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 16384,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `${promptWithContext}\n\nHere is the fixture report email:\n\n${emailText}` },
          ],
        }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorBody = await claudeResponse.text();
      throw new Error(`Claude API error ${claudeResponse.status}: ${errorBody}`);
    }

    const claudeResult = await claudeResponse.json();
    const rawText = claudeResult.content?.[0]?.text ?? "";
    const cleaned = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const extraction: ClaudeFixtureResponse = JSON.parse(cleaned);

    const fixtures = extraction.fixtures ?? [];
    const enquiries = extraction.enquiries ?? [];
    const reportSource = extraction.report_source ?? senderHint ?? "unknown";
    const reportType = extraction.report_type ?? "DPP";

    // Date sanity
    let reportDate = extraction.report_date ?? emailDate ?? new Date().toISOString().slice(0, 10);
    const today = new Date();
    const parsed = new Date(reportDate + "T00:00:00");
    const diffDays = Math.abs((today.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      reportDate = today.toISOString().slice(0, 10);
    }

    // Preview mode
    if (!selectedIds) {
      return new Response(
        JSON.stringify({
          report_source: reportSource,
          report_date: reportDate,
          report_type: reportType,
          fixtures,
          enquiries,
          fixture_count: fixtures.length,
          enquiry_count: enquiries.length,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Import mode
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Dedup: fetch existing vessel names for this source + date
    const { data: existing } = await supabaseAdmin
      .from("market_data")
      .select("vessel_name")
      .eq("report_source", reportSource)
      .eq("report_date", reportDate);

    const existingNames = new Set(
      (existing ?? []).map((r: { vessel_name: string | null }) =>
        (r.vessel_name ?? "").trim().toLowerCase()
      )
    );

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    // Insert fixtures
    for (const f of fixtures) {
      const vesselKey = (f.vessel ?? "").trim().toLowerCase();
      if (vesselKey && existingNames.has(vesselKey)) {
        skipped++;
        continue;
      }

      const row = {
        report_source: reportSource,
        report_date: reportDate,
        report_type: reportType,
        record_type: "FIXTURE",
        source_broker: reportSource,
        vessel_name: f.vessel,
        vessel_class: f.segment,
        charterer: f.charterer,
        quantity_mt: f.qty ? f.qty * 1000 : null,
        cargo_grade: f.cargo,
        cargo_type: f.cargo,
        laycan_from: null,
        laycan_to: null,
        load_port: f.load_port,
        discharge_port: f.discharge_port,
        rate_value: f.rate,
        fixture_status: normalizeStatus(f.status),
        dwt: f.dwt,
        built_year: f.built_year,
        owner: f.owner,
        coating: f.coating,
        confidence: f.confidence,
        raw_text: f.raw_text,
        uploaded_by: uploadedBy,
        pdf_filename: emailSubject,
      };

      const { error } = await supabaseAdmin.from("market_data").insert(row);
      if (error) {
        console.error(`Insert error for ${f.vessel}:`, error.message);
        errors++;
      } else {
        inserted++;
      }
    }

    // Insert enquiries
    for (const e of enquiries) {
      const row = {
        report_source: reportSource,
        report_date: reportDate,
        report_type: reportType,
        record_type: "ENQUIRY",
        source_broker: reportSource,
        vessel_class: e.segment,
        charterer: e.charterer,
        quantity_mt: e.qty ? e.qty * 1000 : null,
        cargo_grade: e.cargo,
        cargo_type: e.cargo,
        load_port: e.load_port,
        discharge_port: e.discharge_port,
        confidence: e.confidence,
        raw_text: e.raw_text,
        uploaded_by: uploadedBy,
        pdf_filename: emailSubject,
      };

      const { error } = await supabaseAdmin.from("market_data").insert(row);
      if (error) {
        console.error(`Insert enquiry error:`, error.message);
        errors++;
      } else {
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        report_source: reportSource,
        report_date: reportDate,
        extracted: fixtures.length + enquiries.length,
        inserted,
        skipped,
        errors,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("parse-email-fixtures error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
