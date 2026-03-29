// supabase/functions/parse-market-report/index.ts
// Accepts a broker report file, extracts structured fixture/enquiry/baltic/bunker
// data via Claude API, and inserts into market_data.

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

interface BalticRoute {
  route: string | null;
  description: string | null;
  size: string | null;
  world_scale: number | null;
  tc_earnings: number | null;
}

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

interface BunkerPrice {
  region: string | null;
  vlsfo: number | null;
  vlsfo_change: number | null;
  ifo380: number | null;
  ifo380_change: number | null;
  mgo: number | null;
  mgo_change: number | null;
}

interface BalticIndexRow {
  route: string;
  description: string | null;
  size: string | null;
  worldscale: number | null;
  ws_change: number | null;
  tc_earnings: number | null;
  tc_change: number | null;
}

interface RateAssessmentRow {
  size_kt: number;
  route_raw: string;
  load_port: string | null;
  discharge_port: string | null;
  rate_ws: number | null;
  rate_lumpsum: number | null;
  rate_type: string;
  confidence: string;
  notes: string | null;
}

interface ClaudeExtractionResponse {
  report_source: string;
  report_date: string;
  report_type: string;
  baltic_routes: BalticRoute[];
  fixtures: FixtureRow[];
  enquiries: EnquiryRow[];
  bunker_prices: BunkerPrice[];
  // Bravo-specific
  baltic_index?: BalticIndexRow[];
  rates_assessment?: RateAssessmentRow[];
}

// ---------- Claude extraction prompt ----------

const EXTRACTION_PROMPT = `You are a maritime broker report extraction engine.

You will receive a daily tanker broker report. Your job is to:

1. IDENTIFY the report automatically:
   - report_source: one of meiwa_vlcc, meiwa_dirty, presco, gibson, vantage_dpp, eastport, yamamoto, alliance, bravo_tankers, unknown
   - report_date: in YYYY-MM-DD format. The current year is 2026.
   - report_type: one of CPP, DPP, SNP, CHEMICAL
     * DPP sources: Meiwa VLCC, Meiwa Dirty, Presco (dirty sections), Gibson, Vantage DPP
     * CPP sources: Eastport, Yamamoto, Alliance, Presco (clean sections)
   - Look at headers, logos, titles, footers to determine source
   - If you cannot determine the source, use "unknown"

2. EXTRACT all four sections into structured JSON.

Return a JSON object with these keys:
{
  "report_source": string,
  "report_date": string (YYYY-MM-DD),
  "report_type": string (CPP/DPP/SNP/CHEMICAL),
  "baltic_routes": [
    { "route": "TD3C", "description": "AG-China", "size": "270,000", "world_scale": 55.38, "tc_earnings": 28500 }
  ],
  "fixtures": [
    { "segment": "VLCC", "charterer": "VITOL", "qty": 270, "cargo": "NHC",
      "laycan": "28-30/Mar", "load_port": "MEG", "discharge_port": "EAST",
      "vessel": "DHT JAGUAR", "rate": "W54.25", "status": "SUBS",
      "dwt": null, "built_year": null, "owner": null, "coating": null,
      "confidence": 0.95, "raw_text": "original line" }
  ],
  "enquiries": [
    { "segment": "MR", "charterer": "BP", "qty": 35, "cargo": "CPP",
      "laycan": "01-Apr", "load_port": "SINGAPORE", "discharge_port": "AUSTRALIA",
      "confidence": 0.9, "raw_text": "original line" }
  ],
  "bunker_prices": [
    { "region": "FUJAIRAH", "vlsfo": 863.00, "vlsfo_change": -78.50,
      "ifo380": 696.50, "ifo380_change": -62.00,
      "mgo": 1566.50, "mgo_change": -74.00 }
  ]
}

Field rules:
- segment: one of VLCC, ULCC, Suezmax, Aframax, Panamax, LR2, LR1, MR, Handy, Chemical, VLGC
- Infer segment from DWT if not explicit:
  VLCC: 200k+, Suezmax: 120-199k, Aframax: 80-119k (dirty), LR2: 80-119k (clean),
  LR1: 55-79k (clean), MR: 25-54k, Handy: <25k
- rate: store EXACTLY as shown in report — "W54.25", "WS467", "$3.2M", "$17.95M", "RNR", "FLD"
- status: one of SUBS, FXD, FLD, RPTD, WDRN (or as appears in report)
- qty: in thousands of MT (e.g. 270 = 270,000 MT)
- laycan: keep as original text from report (e.g. "28-30/Mar", "01-Apr")
- For baltic_routes: extract route code, description, size, worldscale points, TC earnings
- For bunker_prices: extract all regions with VLSFO, IFO380, MGO prices and changes
- If a section is not present in the report, return an empty array for that key
- confidence: 0.0-1.0 per fixture/enquiry

Respond with ONLY valid JSON, no markdown fences, no commentary.`;

// ---------- Bravo Tankers specific prompt ----------
const BRAVO_PROMPT = `You are a maritime broker report extraction engine parsing a BRAVO TANKERS email.

This report may contain up to THREE datasets:
1. RATES GRID (market rate assessments by route) — starts after "RATES GRID" or "CRUDE DESK" header
2. CRUDE FIXTURES by trade region (RSEA/AG, MED/B.SEA, WAFRICA, BALTIC/CONT, USG/CBS/S.AMERICA, INDO/F.EAST)
3. BALTIC EXCHANGE INDEX TABLE with TC and TD route indices

Return JSON:
{
  "report_source": "bravo_tankers",
  "report_date": "YYYY-MM-DD",
  "report_type": "DPP",
  "baltic_routes": [],
  "fixtures": [...],
  "enquiries": [],
  "bunker_prices": [],
  "baltic_index": [
    {"route":"TC5","description":"Clean MEG-Japan","size":"55,000","worldscale":424.38,"ws_change":-1.87,"tc_earnings":74741,"tc_change":1536}
  ],
  "rates_assessment": [
    {"size_kt":80,"route_raw":"CPC/MED","load_port":"CPC","discharge_port":"MED","rate_ws":710,"rate_lumpsum":null,"rate_type":"WS","confidence":"UNTESTED","notes":null},
    {"size_kt":130,"route_raw":"RDAM/SPORE","load_port":"RDAM","discharge_port":"SPORE","rate_ws":null,"rate_lumpsum":15500000,"rate_type":"LUMPSUM","confidence":"FIRM","notes":"C/C"}
  ]
}

RATES GRID EXTRACTION:
- Lines like: "80KT CPC/MED WS 710 UNTESTED" or "130KT RDAM/SPORE $15.5M FIRM (C/C)"
- size_kt: number before KT (80, 130, 140, 145, 260, 270)
- route_raw: the route string (e.g. "CPC/MED")
- load_port: text before "/" in route
- discharge_port: text after "/" in route
- rate_ws: number after "WS" if WS rate (null if lumpsum)
- rate_lumpsum: dollar value in full (e.g. $15.5M = 15500000) if lumpsum (null if WS)
- rate_type: "WS" or "LUMPSUM"
- confidence: "FIRM", "FIRM_TO_BE_TESTED" (for "FIRM/TO BE TESTED"), or "UNTESTED"
- notes: text in parentheses like "(C/C)" or "(S/S)" — null if none
- If WS has no number (just "WS" with blank value), set rate_ws = null, rate_type = "WS"
- If rates grid section is not present, return empty array

FIXTURE EXTRACTION RULES:
- Each region section starts with a header like "RSEA/AG" followed by dashes
- Parse every fixture line: VESSEL QTY LAYCAN ROUTE RATE CHARTERER [STATUS/NOTES]
- segment: infer from qty (260-270=VLCC, 130-145=Suezmax, 70-100=Aframax, 50-70=Panamax, 35=MR)
- "FLD YDAY" or "FLD" → status = "FLD"
- "MFA" (more firm awaited) → status = "-"
- "OO" (on order) → status = "-"
- "OLD" in Bravo means older fixture, NOT our status = map to "-"
- "DEM 275K" → extract as demurrage, not part of rate
- "HC" before qty = Heavy Crude cargo
- "FO" before qty = Fuel Oil cargo
- Otherwise cargo = NHC (Non Heavy Crude) for crude fixtures
- rate: store exactly as shown. If "W450-17.95M" = dual rate, store full string
- qty in thousands (130 = 130,000 MT)
- laycan: keep as text "12-14 APR", "18-20 APR"

BALTIC INDEX TABLE:
- Starts after fixture sections, contains "Index Routes Size" header
- Parse ALL rows starting with TC or TD
- TC routes = clean tanker indices (TC5, TC8, TC12, TC17 etc.)
- TD routes = dirty tanker indices (TD2, TD3C, TD6 etc.)
- Extract: route, description, size, worldscale value, ws_change, tc_earnings_usd, tc_change
- The table has columns for two dates — use the MOST RECENT date column values

Respond with ONLY valid JSON, no markdown fences.`;

// ---------- File handling ----------

const IMAGE_TYPES = new Set([
  "image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp",
]);

function detectMediaType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const extMap: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", webp: "image/webp",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
  };
  return extMap[ext] ?? "application/octet-stream";
}

const TEXT_EXTRACT_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv", "application/msword", "application/vnd.ms-excel",
]);

async function extractDocxText(base64: string): Promise<string> {
  const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const zip = await JSZip.loadAsync(bytes);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return "[Could not extract text from .docx]";
  return docXml
    .replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/\n{3,}/g, "\n\n").trim();
}

async function extractXlsxText(base64: string): Promise<string> {
  const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const zip = await JSZip.loadAsync(bytes);
  const ssXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  const strings: string[] = [];
  if (ssXml) {
    const matches = ssXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
    for (const m of matches) strings.push(m[1]);
  }
  const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
  if (!sheetXml) return "[Could not extract text from .xlsx]";
  const rows: string[] = [];
  const rowMatches = sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g);
  for (const rm of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rm[1].matchAll(/<c[^>]*(?:t="s"[^>]*)?>[\s\S]*?<v>(\d+)<\/v>[\s\S]*?<\/c>|<c[^>]*>[\s\S]*?<v>([^<]*)<\/v>[\s\S]*?<\/c>/g);
    for (const cm of cellMatches) {
      if (cm[1] !== undefined) cells.push(strings[parseInt(cm[1])] ?? cm[1]);
      else if (cm[2] !== undefined) cells.push(cm[2]);
    }
    if (cells.length > 0) rows.push(cells.join("\t"));
  }
  return rows.join("\n").trim() || "[Empty spreadsheet]";
}

function extractCsvText(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function extractTextFromFile(base64: string, mediaType: string): Promise<string> {
  if (mediaType.includes("wordprocessingml") || mediaType === "application/msword")
    return extractDocxText(base64);
  if (mediaType.includes("spreadsheetml") || mediaType === "application/vnd.ms-excel")
    return extractXlsxText(base64);
  if (mediaType === "text/csv") return extractCsvText(base64);
  return "[Unsupported file format]";
}

// ---------- Claude API call ----------

async function extractFromFile(
  fileBase64: string,
  mediaType: string,
  promptOverride?: string
): Promise<ClaudeExtractionResponse> {
  const content: Record<string, unknown>[] = [];

  if (IMAGE_TYPES.has(mediaType)) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data: fileBase64 },
    });
  } else if (mediaType === "application/pdf") {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
    });
  } else if (TEXT_EXTRACT_TYPES.has(mediaType)) {
    const text = await extractTextFromFile(fileBase64, mediaType);
    content.push({
      type: "text",
      text: `Here is the content of a broker report file:\n\n${text}`,
    });
  } else {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
    });
  }

  content.push({ type: "text", text: promptOverride ?? EXTRACTION_PROMPT });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16384,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  const text = result.content?.[0]?.text ?? "";
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned) as ClaudeExtractionResponse;
}

// ---------- Source detection fallback ----------

const SOURCE_PATTERNS: Record<string, string[]> = {
  meiwa_vlcc: ["meiwa", "vlcc"],
  meiwa_dirty: ["meiwa", "dirty"],
  presco: ["presco"],
  gibson: ["gibson"],
  vantage_dpp: ["vantage"],
  eastport: ["eastport"],
  yamamoto: ["yamamoto"],
  alliance: ["alliance"],
  bravo_tankers: ["bravo"],
};

function inferSourceFromFilename(fileName: string): string | null {
  const fn = fileName.toLowerCase();
  for (const [src, keywords] of Object.entries(SOURCE_PATTERNS)) {
    if (keywords.every((kw) => fn.includes(kw))) return src;
  }
  return null;
}

// Infer report_type from source if Claude didn't detect it
const DPP_SOURCES = new Set(["meiwa_vlcc", "meiwa_dirty", "gibson", "vantage_dpp", "bravo_tankers"]);
const CPP_SOURCES = new Set(["eastport", "yamamoto", "alliance"]);

function inferReportType(source: string, claudeType: string | null): string {
  if (claudeType && ["CPP", "DPP", "SNP", "CHEMICAL"].includes(claudeType)) return claudeType;
  if (DPP_SOURCES.has(source)) return "DPP";
  if (CPP_SOURCES.has(source)) return "CPP";
  if (source === "presco") return "DPP"; // Presco defaults to DPP
  return "DPP";
}

// ---------- Normalize fixture status ----------

function normalizeStatus(s: string | null): string {
  if (!s) return "reported";
  const u = s.toUpperCase().trim();
  if (u === "SUBS" || u === "ON SUBS" || u === "O/S") return "on_subs";
  if (u === "FXD" || u === "FIXED" || u === "DONE") return "fixed";
  if (u === "FLD" || u === "FAILED") return "failed";
  if (u === "WDRN" || u === "WITHDRAWN") return "withdrawn";
  if (u === "RPTD" || u === "REPORTED") return "reported";
  if (u === "RNR") return "reported";
  return "reported";
}

// ---------- Handler ----------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    const contentType = req.headers.get("content-type") ?? "";
    let base64: string;
    let uploadedBy: string | null;
    let fileName: string;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      base64 = body.file_base64;
      uploadedBy = body.uploaded_by ?? null;
      fileName = body.file_name ?? "upload.pdf";
      if (!base64) {
        return new Response(
          JSON.stringify({ error: "file_base64 is required" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      uploadedBy = formData.get("uploaded_by") as string | null;
      if (!file) {
        return new Response(
          JSON.stringify({ error: "A file is required" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }
      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      base64 = btoa(String.fromCharCode(...uint8));
    }

    const mediaType = detectMediaType(fileName);

    // Detect if Bravo Tankers from filename
    const fnLower = fileName.toLowerCase();
    const isBravo = fnLower.includes("bravo") || fnLower.includes("daily crude") || fnLower.includes("rates grid");
    const bravoEmailType = fnLower.includes("rates grid") || fnLower.includes("crude desk")
      ? "rates_grid" : "fixtures";

    // Extract via Claude (use Bravo prompt if detected)
    const extraction = await extractFromFile(base64, mediaType, isBravo ? BRAVO_PROMPT : undefined);

    // Determine source
    let reportSource = extraction.report_source ?? "unknown";
    if (reportSource === "unknown") {
      reportSource = inferSourceFromFilename(fileName) ?? "unknown";
    }
    if (isBravo && reportSource === "unknown") reportSource = "bravo_tankers";

    // Date sanity check
    let reportDate = extraction.report_date ?? new Date().toISOString().slice(0, 10);
    const today = new Date();
    const parsed = new Date(reportDate + "T00:00:00");
    const diffDays = Math.abs((today.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      console.warn(`Date sanity: Claude returned ${reportDate}, using today.`);
      reportDate = today.toISOString().slice(0, 10);
    }

    // Report type
    const reportType = inferReportType(reportSource, extraction.report_type);

    // Dedup: fetch existing vessel names for this source + date
    const { data: existing } = await supabaseAdmin
      .from("market_data")
      .select("vessel_name, record_type, baltic_route, bunker_region")
      .eq("report_source", reportSource)
      .eq("report_date", reportDate);

    const existingFixtures = new Set(
      (existing ?? [])
        .filter((r) => r.record_type === "FIXTURE")
        .map((r) => (r.vessel_name ?? "").trim().toLowerCase())
    );
    const existingBaltic = new Set(
      (existing ?? [])
        .filter((r) => r.record_type === "BALTIC")
        .map((r) => (r.baltic_route ?? "").trim().toLowerCase())
    );
    const existingBunker = new Set(
      (existing ?? [])
        .filter((r) => r.record_type === "BUNKER")
        .map((r) => (r.bunker_region ?? "").trim().toLowerCase())
    );
    const existingEnquiries = new Set(
      (existing ?? [])
        .filter((r) => r.record_type === "ENQUIRY")
        .map((r) => `${(r.vessel_name ?? "").trim().toLowerCase()}`)
    );

    const allRows: Record<string, unknown>[] = [];

    // --- Baltic routes ---
    for (const b of extraction.baltic_routes ?? []) {
      const key = (b.route ?? "").trim().toLowerCase();
      if (existingBaltic.has(key)) continue;
      allRows.push({
        report_source: reportSource,
        report_date: reportDate,
        report_type: reportType,
        record_type: "BALTIC",
        source_broker: reportSource,
        baltic_route: b.route,
        baltic_description: b.description,
        baltic_size: b.size,
        world_scale: b.world_scale,
        tc_earnings: b.tc_earnings,
        uploaded_by: uploadedBy,
        pdf_filename: fileName,
      });
    }

    // --- Fixtures ---
    for (const f of extraction.fixtures ?? []) {
      const vesselKey = (f.vessel ?? "").trim().toLowerCase();
      if (vesselKey && existingFixtures.has(vesselKey)) continue;
      allRows.push({
        report_source: reportSource,
        report_date: reportDate,
        report_type: reportType,
        record_type: "FIXTURE",
        source_broker: reportSource,
        vessel_class: f.segment,
        vessel_name: f.vessel,
        charterer: f.charterer,
        quantity_mt: f.qty ? f.qty * 1000 : null, // qty is in thousands
        cargo_grade: f.cargo,
        cargo_type: reportType === "CPP" ? "CPP" : (reportType === "DPP" ? (f.segment && ["VLCC", "Suezmax", "Aframax"].includes(f.segment) ? "Crude" : "DPP") : null),
        load_port: f.load_port,
        discharge_port: f.discharge_port,
        rate_value: f.rate,
        rate_type: f.rate?.startsWith("W") ? "WS" : f.rate?.startsWith("$") ? "lumpsum" : null,
        rate_numeric: parseRateNumeric(f.rate),
        fixture_status: normalizeStatus(f.status),
        raw_text: f.raw_text ?? `${f.laycan}`,
        dwt: f.dwt,
        built_year: f.built_year,
        owner: f.owner,
        coating: f.coating,
        confidence: f.confidence,
        uploaded_by: uploadedBy,
        pdf_filename: fileName,
      });
    }

    // --- Enquiries ---
    for (const e of extraction.enquiries ?? []) {
      // Dedup enquiries by charterer+cargo+load+discharge combo
      const enqKey = `${(e.charterer ?? "").trim().toLowerCase()}-${(e.cargo ?? "")}-${(e.load_port ?? "")}-${(e.discharge_port ?? "")}`.toLowerCase();
      if (existingEnquiries.has(enqKey)) continue;
      allRows.push({
        report_source: reportSource,
        report_date: reportDate,
        report_type: reportType,
        record_type: "ENQUIRY",
        source_broker: reportSource,
        vessel_class: e.segment,
        charterer: e.charterer,
        quantity_mt: e.qty ? e.qty * 1000 : null,
        cargo_grade: e.cargo,
        cargo_type: reportType === "CPP" ? "CPP" : "DPP",
        load_port: e.load_port,
        discharge_port: e.discharge_port,
        raw_text: e.raw_text ?? `${e.laycan}`,
        fixture_status: "reported",
        confidence: e.confidence,
        uploaded_by: uploadedBy,
        pdf_filename: fileName,
      });
    }

    // --- Bunker prices ---
    for (const bp of extraction.bunker_prices ?? []) {
      const key = (bp.region ?? "").trim().toLowerCase();
      if (existingBunker.has(key)) continue;
      allRows.push({
        report_source: reportSource,
        report_date: reportDate,
        report_type: reportType,
        record_type: "BUNKER",
        source_broker: reportSource,
        bunker_region: bp.region,
        vlsfo_price: bp.vlsfo,
        vlsfo_change: bp.vlsfo_change,
        ifo380_price: bp.ifo380,
        ifo380_change: bp.ifo380_change,
        mgo_price: bp.mgo,
        mgo_change: bp.mgo_change,
        uploaded_by: uploadedBy,
        pdf_filename: fileName,
      });
    }

    // Count what we're inserting
    const counts = {
      baltic: allRows.filter((r) => r.record_type === "BALTIC").length,
      fixtures: allRows.filter((r) => r.record_type === "FIXTURE").length,
      enquiries: allRows.filter((r) => r.record_type === "ENQUIRY").length,
      bunker: allRows.filter((r) => r.record_type === "BUNKER").length,
    };
    const totalExtracted =
      (extraction.baltic_routes?.length ?? 0) +
      (extraction.fixtures?.length ?? 0) +
      (extraction.enquiries?.length ?? 0) +
      (extraction.bunker_prices?.length ?? 0);
    const skipped = totalExtracted - allRows.length;

    if (allRows.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          inserted: 0,
          skipped,
          report_source: reportSource,
          report_date: reportDate,
          report_type: reportType,
          counts,
          message: skipped > 0 ? `All ${skipped} records already exist` : "No data found in report",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Insert
    const { data, error } = await supabaseAdmin
      .from("market_data")
      .insert(allRows)
      .select("id");

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    // Store Baltic index data from Bravo Tankers
    // Store Baltic index data (from Bravo or any source that provides it)
    if (extraction.baltic_index && extraction.baltic_index.length > 0) {
      const emailType = isBravo ? bravoEmailType : null;
      const tcRoutes = extraction.baltic_index.filter((r) => r.route.startsWith("TC"));
      const tdRoutes = extraction.baltic_index.filter((r) => r.route.startsWith("TD"));

      if (tcRoutes.length > 0) {
        await supabaseAdmin.from("baltic_routes").upsert(
          tcRoutes.map((r) => ({
            report_date: reportDate, route: r.route, description: r.description,
            size_mt: r.size, worldscale: r.worldscale, ws_change: r.ws_change,
            tc_earnings_usd: r.tc_earnings, tc_change: r.tc_change,
            source_broker: reportSource, source_email: emailType,
          })),
          { onConflict: "report_date,route,source_broker" }
        );
      }

      if (tdRoutes.length > 0) {
        await supabaseAdmin.from("dirty_baltic_routes").upsert(
          tdRoutes.map((r) => ({
            report_date: reportDate, route: r.route, description: r.description,
            size_mt: r.size, worldscale: r.worldscale, ws_change: r.ws_change,
            tc_earnings_usd: r.tc_earnings, tc_change: r.tc_change,
            source_broker: reportSource, source_email: emailType,
          })),
          { onConflict: "report_date,route,source_broker" }
        );
      }
    }

    // Store rates assessment data (from Bravo rates grid)
    if (extraction.rates_assessment && extraction.rates_assessment.length > 0) {
      const sizeToClass = (kt: number): string => {
        if (kt >= 260) return "VLCC";
        if (kt >= 130) return "Suezmax";
        if (kt >= 70) return "Aframax";
        if (kt >= 50) return "Panamax";
        return "MR";
      };

      const rateRows = extraction.rates_assessment.map((r) => ({
        report_date: reportDate,
        source: reportSource,
        source_email: isBravo ? bravoEmailType : null,
        size_kt: r.size_kt,
        vessel_class: sizeToClass(r.size_kt),
        load_port: r.load_port,
        discharge_port: r.discharge_port,
        route_raw: r.route_raw,
        rate_ws: r.rate_ws,
        rate_lumpsum: r.rate_lumpsum,
        rate_type: r.rate_type,
        confidence: r.confidence,
        notes: r.notes,
      }));

      await supabaseAdmin.from("rates_assessment").upsert(rateRows, {
        onConflict: "report_date,source,size_kt,route_raw",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: data?.length ?? 0,
        skipped,
        report_source: reportSource,
        report_date: reportDate,
        report_type: reportType,
        counts,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("parse-market-report error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});

// ---------- Helpers ----------

function parseRateNumeric(rate: string | null): number | null {
  if (!rate) return null;
  const r = rate.trim().toUpperCase();
  if (r === "RNR" || r === "FLD" || r === "TBN") return null;

  // Worldscale: W54.25 or WS467
  const wsMatch = r.match(/^W[S]?(\d+\.?\d*)$/);
  if (wsMatch) return parseFloat(wsMatch[1]);

  // Lumpsum: $3.2M or $17.95M or $850k
  const lsMatch = r.match(/^\$(\d+\.?\d*)(M|K)?$/i);
  if (lsMatch) {
    const val = parseFloat(lsMatch[1]);
    const unit = (lsMatch[2] ?? "").toUpperCase();
    if (unit === "M") return val * 1_000_000;
    if (unit === "K") return val * 1_000;
    return val;
  }

  // Plain number
  const num = parseFloat(r.replace(/[,$]/g, ""));
  return isNaN(num) ? null : num;
}
