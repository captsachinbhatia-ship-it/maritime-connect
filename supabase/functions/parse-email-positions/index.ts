// supabase/functions/parse-email-positions/index.ts
// Accepts position list email body text, extracts vessel positions via Claude,
// and upserts into vessel_position_list table.

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

interface PositionRow {
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
  cap_rating: string | null;
  status: string | null;
  comments: string | null;
  raw_text: string | null;
}

interface ClaudePositionResponse {
  source_name: string;
  report_date: string;
  positions: PositionRow[];
}

// ---------- Claude extraction prompt ----------

const POSITION_PROMPT = `You are a maritime vessel position list extraction engine.

You will receive the plain text body of a daily position list email from a shipowner, operator, or commercial manager (Fearnleys, Heidmar, Maersk Tankers, Hafnia, Torm, BW, Stena, Minerva, Thenamaris, d'Amico, Scorpio, etc.).

Your job is to extract ALL vessel positions into structured JSON.

Return:
{
  "source_name": "Heidmar" (infer from email content/signature/header),
  "report_date": "YYYY-MM-DD" (the current year is 2026),
  "positions": [
    {
      "vessel_name": "FRONT JAGUAR",
      "imo": "9812345" (if shown, null otherwise),
      "vessel_class": "VLCC",
      "cargo_type": "DPP",
      "dwt": 299999,
      "cbm": null,
      "built_year": 2019,
      "flag": "Marshall Islands",
      "owner": "Frontline",
      "operator": "Frontline",
      "manager": null,
      "open_port": "Fujairah",
      "open_region": "AG",
      "open_date": "2026-04-05",
      "open_date_text": "05-Apr",
      "direction": "East",
      "direction_region": "Far East",
      "last_cargo_1": "NHC",
      "last_cargo_2": "FO",
      "last_cargo_3": null,
      "cargo_history": "NHC/FO",
      "coating": "EPOXY",
      "ice_class": null,
      "imo_class": null,
      "heating": true,
      "nitrogen": false,
      "cap_rating": null,
      "status": "open",
      "comments": "Pref AG/East loading",
      "raw_text": "original line from email"
    }
  ]
}

Field rules:
- vessel_class: one of VLCC, Suezmax, Aframax, LR2, LR1, MR, Handy, Specialized, VLGC, Chemical
  Infer from DWT if not explicit: VLCC 200k+, Suezmax 120-199k, Aframax 80-119k (dirty),
  LR2 80-119k (clean), LR1 55-79k (clean), MR 25-54k, Handy <25k
- cargo_type: DPP (dirty/crude), CPP (clean), Chemical, LPG, Gas — infer from vessel class and last cargoes
- open_region: AG, Med, Black Sea, UKC, Baltic, WAF, USG, USEC, Far East, India, Caribbean, RSEA, SE Asia, Red Sea, East Africa
- open_date: convert to YYYY-MM-DD. Current year is 2026 unless stated. "05 Apr" = "2026-04-05"
- open_date_text: keep as original text from email
- status: open | on_subs | fixed | ballasting | in_dock. Default "open" if not stated
- last_cargo_1/2/3: most recent first. Use cargo codes: NHC, HC, FO, LSFO, NAP, CPP, ULSD, GO, UNL, COND, VGO, MOGAS, JET, BITUMEN, METHANOL, BENZENE
- cargo_history: combined string of L3C separated by "/"
- coating: EPOXY, MARINELINE, STAINLESS STEEL, ZINC, PHENOLIC — extract if shown
- heating/nitrogen: boolean, extract if mentioned ("HTD"=true, "N2"=true)
- ice_class: 1A, 1B, 1C, or null
- imo_class: "IMO 2", "IMO 3", "IMO 2/3" for chemical tankers, null for crude/product
- raw_text: the original line(s) for this vessel from the email

Respond with ONLY valid JSON, no markdown fences, no commentary.`;

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

    // Call Claude to extract positions
    const promptWithContext = senderHint
      ? `${POSITION_PROMPT}\n\nSender hint: ${senderHint}\nEmail subject: ${emailSubject ?? "unknown"}`
      : POSITION_PROMPT;

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
            { type: "text", text: `${promptWithContext}\n\nHere is the position list email:\n\n${emailText}` },
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
    const extraction: ClaudePositionResponse = JSON.parse(cleaned);

    const positions = extraction.positions ?? [];
    const sourceName = extraction.source_name ?? senderHint ?? "unknown";

    // Date sanity
    let reportDate = extraction.report_date ?? emailDate ?? new Date().toISOString().slice(0, 10);
    const today = new Date();
    const parsed = new Date(reportDate + "T00:00:00");
    const diffDays = Math.abs((today.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      reportDate = today.toISOString().slice(0, 10);
    }

    // Preview mode: if no selected_ids, return extracted positions for user review
    if (!selectedIds) {
      return new Response(
        JSON.stringify({
          source_name: sourceName,
          report_date: reportDate,
          positions,
          count: positions.length,
        }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Import mode: upsert selected (or ALL) positions
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const toImport = selectedIds === "ALL"
      ? positions
      : positions.filter((_, i) => {
          const ids = selectedIds.split(",").map((s: string) => parseInt(s.trim()));
          return ids.includes(i);
        });

    let inserted = 0;
    let errors = 0;

    for (const pos of toImport) {
      if (!pos.vessel_name) continue;

      const row = {
        report_date: reportDate,
        source_name: sourceName,
        source_email: senderHint,
        email_subject: emailSubject,
        thread_id: threadId,
        import_method: uploadedBy ? "manual" : "email_scan",
        imported_by: uploadedBy,
        vessel_name: pos.vessel_name.toUpperCase().trim(),
        imo: pos.imo,
        vessel_class: pos.vessel_class,
        cargo_type: pos.cargo_type,
        dwt: pos.dwt,
        cbm: pos.cbm,
        built_year: pos.built_year,
        flag: pos.flag,
        owner: pos.owner,
        operator: pos.operator,
        manager: pos.manager,
        open_port: pos.open_port,
        open_region: pos.open_region,
        open_date: pos.open_date,
        open_date_text: pos.open_date_text,
        direction: pos.direction,
        direction_region: pos.direction_region,
        last_cargo_1: pos.last_cargo_1,
        last_cargo_2: pos.last_cargo_2,
        last_cargo_3: pos.last_cargo_3,
        cargo_history: pos.cargo_history,
        coating: pos.coating,
        ice_class: pos.ice_class,
        imo_class: pos.imo_class,
        heating: pos.heating,
        nitrogen: pos.nitrogen,
        cap_rating: pos.cap_rating,
        status: pos.status ?? "open",
        comments: pos.comments,
        raw_text: pos.raw_text,
      };

      // Upsert: if same vessel+source+date exists, update
      const { error } = await supabaseAdmin
        .from("vessel_position_list")
        .upsert(row, {
          onConflict: "vessel_name,source_name,report_date",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error(`Upsert error for ${pos.vessel_name}:`, error.message);
        errors++;
      } else {
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        source_name: sourceName,
        report_date: reportDate,
        extracted: positions.length,
        inserted,
        errors,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("parse-email-positions error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
