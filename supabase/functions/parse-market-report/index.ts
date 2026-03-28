// supabase/functions/parse-market-report/index.ts
// Accepts a PDF upload, auto-detects source & date, extracts fixture
// rows via Claude API, and inserts structured rows into market_data.

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
  coating: string | null;
  confidence: number | null;
  raw_text: string | null;
}

interface ClaudeExtractionResponse {
  report_source: string;
  report_date: string;
  fixtures: FixtureRow[];
}

// ---------- Claude extraction ----------

const EXTRACTION_PROMPT = `You are a maritime fixture data extraction engine.

You will receive a daily tanker broker report PDF. Your job is to:

1. IDENTIFY the report source and date automatically:
   - Report source must be one of: meiwa_vlcc, meiwa_dirty, presco, gibson, vantage_dpp, eastport, alliance
   - Look at the header, logo, title, or footer to determine the source
   - Find the report date from the document (usually in the header or title)
   - IMPORTANT: The current year is 2026. If the document says "27.MAR.2026" or "March 27, 2026" or "27/03/2026", the date is 2026-03-27. Do NOT use 2024 or 2025 unless the document explicitly states those years.
   - If you cannot determine the source, use "unknown"
   - Format the date as YYYY-MM-DD

2. EXTRACT every fixture and enquiry row into structured data.

Return a JSON object with these top-level keys:
- "report_source": string — one of: meiwa_vlcc, meiwa_dirty, presco, gibson, vantage_dpp, eastport, alliance, unknown
- "report_date": string — the report date in YYYY-MM-DD format
- "fixtures": array of objects

Each fixture object must have these fields (use null for missing values):

- vessel_name: string — vessel name (e.g. "FRONT DEFENDER")
- vessel_class: string — one of: VLCC, ULCC, Suezmax, Aframax, Panamax, LR2, LR1, MR, Small Tanker, GP, Handy, Coaster, VLGC, LGC, MGC, SGC, Chemical, Capesize, Kamsarmax, Supramax, Handymax, Handysize (infer from DWT, cargo, or report section)
- dwt: number — deadweight tonnage
- built_year: number — year built
- flag: string — vessel flag state
- owner: string — vessel owner/operator
- charterer: string — chartering company
- cargo_grade: string — specific cargo (e.g. "Arabian Light", "Naphtha", "Fuel Oil 380")
- cargo_type: string — one of: Crude, CPP, DPP, Chemical, LPG, LNG, Vegetable Oil, Dry Bulk
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
- coating: string — tank coating if mentioned (e.g. "Epoxy", "Phenolic Epoxy", "Zinc", "Stainless Steel", "Marineline", or null)
- confidence: number — your confidence in the extraction accuracy (0.0 to 1.0)
- raw_text: string — the original line(s) from the report for this fixture

Vessel class inference rules:
- VLCC: 200,000+ DWT (crude)
- ULCC: 320,000+ DWT (crude)
- Suezmax: 120,000–199,999 DWT (crude)
- Aframax: 80,000–119,999 DWT (crude/dirty)
- Panamax: 60,000–80,000 DWT
- LR2: 80,000–119,999 DWT (clean/CPP cargo)
- LR1: 55,000–79,999 DWT (clean/CPP cargo)
- MR: 25,000–54,999 DWT (clean products)
- Small Tanker: 3,000–10,000 DWT
- GP: 10,000–24,999 DWT
- Handy: 25,000–39,999 DWT (general/chemical)
- VLGC: 80,000+ cbm (LPG)
- LGC/MGC/SGC: smaller gas carriers
- Chemical: chemical tankers with coated tanks
- Capesize/Kamsarmax/Supramax/Handymax/Handysize: dry bulk vessels

Date inference: If the report only says "5/4" or "Apr 5", interpret relative to the report date. Convert to YYYY-MM-DD.

Respond with ONLY valid JSON, no markdown fences, no commentary.`;

// Map file extensions / MIME types to Claude API content block types
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
]);

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
  "text/csv",
  "application/msword",     // .doc
  "application/vnd.ms-excel", // .xls
]);

function detectMediaType(fileName: string, providedType?: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const extMap: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    csv: "text/csv",
  };
  return extMap[ext] ?? providedType ?? "application/octet-stream";
}

// Types that Claude document API supports natively
const NATIVE_DOC_TYPES = new Set(["application/pdf"]);

// Types that need text extraction before sending to Claude
const TEXT_EXTRACT_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/msword",
  "application/vnd.ms-excel",
]);

/** Extract text from a .docx file (ZIP containing XML) */
async function extractDocxText(base64: string): Promise<string> {
  const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const zip = await JSZip.loadAsync(bytes);
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) return "[Could not extract text from .docx]";

  // Strip XML tags, keep text content
  return docXml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Extract text from a .xlsx file (ZIP containing XML) */
async function extractXlsxText(base64: string): Promise<string> {
  const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const zip = await JSZip.loadAsync(bytes);

  // Read shared strings
  const ssXml = await zip.file("xl/sharedStrings.xml")?.async("string");
  const strings: string[] = [];
  if (ssXml) {
    const matches = ssXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
    for (const m of matches) strings.push(m[1]);
  }

  // Read first sheet
  const sheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
  if (!sheetXml) return "[Could not extract text from .xlsx]";

  const rows: string[] = [];
  const rowMatches = sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g);
  for (const rm of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rm[1].matchAll(/<c[^>]*(?:t="s"[^>]*)?>[\s\S]*?<v>(\d+)<\/v>[\s\S]*?<\/c>|<c[^>]*>[\s\S]*?<v>([^<]*)<\/v>[\s\S]*?<\/c>/g);
    for (const cm of cellMatches) {
      if (cm[1] !== undefined) {
        cells.push(strings[parseInt(cm[1])] ?? cm[1]);
      } else if (cm[2] !== undefined) {
        cells.push(cm[2]);
      }
    }
    if (cells.length > 0) rows.push(cells.join("\t"));
  }
  return rows.join("\n").trim() || "[Empty spreadsheet]";
}

/** Decode base64 CSV to text */
function extractCsvText(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Extract text from non-native file types */
async function extractTextFromFile(
  base64: string,
  mediaType: string
): Promise<string> {
  if (mediaType.includes("wordprocessingml") || mediaType === "application/msword") {
    return extractDocxText(base64);
  }
  if (mediaType.includes("spreadsheetml") || mediaType === "application/vnd.ms-excel") {
    return extractXlsxText(base64);
  }
  if (mediaType === "text/csv") {
    return extractCsvText(base64);
  }
  return "[Unsupported file format]";
}

async function extractFixtures(
  fileBase64: string,
  mediaType: string
): Promise<ClaudeExtractionResponse> {
  // Build the message content based on file type
  const content: Record<string, unknown>[] = [];

  if (IMAGE_TYPES.has(mediaType)) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data: fileBase64 },
    });
  } else if (NATIVE_DOC_TYPES.has(mediaType)) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
    });
  } else if (TEXT_EXTRACT_TYPES.has(mediaType)) {
    // Extract text from Word/Excel/CSV, send as text block
    const text = await extractTextFromFile(fileBase64, mediaType);
    content.push({
      type: "text",
      text: `Here is the content of a broker report file:\n\n${text}`,
    });
  } else {
    // Fallback: try as PDF
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
    });
  }

  content.push({
    type: "text",
    text: EXTRACTION_PROMPT,
  });

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
          content,
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
          {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      uploadedBy = formData.get("uploaded_by") as string | null;

      if (!file) {
        return new Response(
          JSON.stringify({ error: "A file is required" }),
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

    // Detect media type from file name
    const mediaType = detectMediaType(fileName);

    // Extract fixtures via Claude (auto-detects source & date)
    const extraction = await extractFixtures(base64, mediaType);

    // Determine report source — fallback to filename matching if Claude says "unknown"
    let reportSource = extraction.report_source ?? "unknown";
    if (reportSource === "unknown") {
      const fn = fileName.toLowerCase();
      const SOURCE_PATTERNS: Record<string, string[]> = {
        meiwa_vlcc: ["meiwa", "vlcc"],
        meiwa_dirty: ["meiwa", "dirty"],
        presco: ["presco"],
        gibson: ["gibson"],
        vantage_dpp: ["vantage"],
        eastport: ["eastport"],
        alliance: ["alliance"],
      };
      for (const [src, keywords] of Object.entries(SOURCE_PATTERNS)) {
        if (keywords.every((kw) => fn.includes(kw))) {
          reportSource = src;
          break;
        }
      }
    }

    // Sanity check: if Claude returned a date more than 30 days from today, use today
    let reportDate = extraction.report_date ?? new Date().toISOString().slice(0, 10);
    const today = new Date();
    const parsed = new Date(reportDate + "T00:00:00");
    const diffDays = Math.abs(
      (today.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 30) {
      console.warn(
        `Date sanity check: Claude returned ${reportDate} (${diffDays.toFixed(0)} days off). Using today.`
      );
      reportDate = today.toISOString().slice(0, 10);
    }

    if (!extraction.fixtures || extraction.fixtures.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          inserted: 0,
          skipped: 0,
          report_source: reportSource,
          report_date: reportDate,
          message: "No fixtures found in the report",
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Dedup: fetch existing vessel names for this source + date
    const { data: existing } = await supabaseUser
      .from("market_data")
      .select("vessel_name")
      .eq("report_source", reportSource)
      .eq("report_date", reportDate);

    const existingNames = new Set(
      (existing ?? []).map((r: { vessel_name: string | null }) =>
        (r.vessel_name ?? "").trim().toLowerCase()
      )
    );

    const newFixtures = extraction.fixtures.filter(
      (f) => !existingNames.has((f.vessel_name ?? "").trim().toLowerCase())
    );
    const skipped = extraction.fixtures.length - newFixtures.length;

    if (newFixtures.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          inserted: 0,
          skipped,
          report_source: reportSource,
          report_date: reportDate,
          message: `All ${skipped} fixtures already exist`,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Build insert rows
    const rows = newFixtures.map((f) => ({
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
      coating: f.coating,
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
        skipped,
        fixtures: extraction.fixtures.length,
        report_source: reportSource,
        report_date: reportDate,
        sample: newFixtures.slice(0, 3),
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
