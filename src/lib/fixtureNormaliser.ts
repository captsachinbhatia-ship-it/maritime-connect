/**
 * Pre-PDF normalisation: dedup, rate conflict resolution, alias application.
 * This runs client-side before PDF generation. It does NOT modify the DB.
 *
 * For CRM UI, it also tags fixtures with conflict/mismatch badges.
 */

import type { MarketRecord, Resolution } from "@/services/marketData";

// ---------- Port aliases (client-side fallback, DB table is authoritative) ----------

const PORT_ALIASES: Record<string, string> = {
  SPORE: "Singapore", SIN: "Singapore", SGP: "Singapore", "S'PORE": "Singapore",
  OZ: "Australia", AUS: "Australia", AUSSIE: "Australia",
  AG: "MEG", "ARABIAN GULF": "MEG", "PERSIAN GULF": "MEG",
  FUJ: "Fujairah", FUJI: "Fujairah",
  RT: "Ras Tanura", RASTANURA: "Ras Tanura",
  JA: "Jebel Ali", BASRAH: "Basra", BSR: "Basra",
  "FAR EAST": "Far East", FE: "Far East", FEAST: "Far East",
  IND: "India", BOMBAY: "Mumbai", MUM: "Mumbai",
  RDAM: "Rotterdam", RTM: "Rotterdam", AMS: "Amsterdam",
  "UK CONTINENT": "UKC", "UK-CONT": "UKC", UKCM: "UK Continent",
  MEDITERRANEAN: "Med", "WEST AFRICA": "WAF", WAFR: "WAF",
  LOS: "Lagos", "US GULF": "USG", USGC: "USG", HOU: "Houston",
  CARIBBEAN: "Caribs", CARIB: "Caribs",
  "EAST COAST SOUTH AMERICA": "ECSA", BRZ: "Brazil", BRZL: "Brazil",
  "BLACK SEA": "BSea", BLSEA: "BSea",
  NOVO: "Novorossiysk", NVRS: "Novorossiysk",
  "RED SEA": "RSea", REDSEA: "RSea", RSEA: "RSea",
};

// ---------- Charterer aliases (client-side fallback) ----------

const CHARTERER_ALIASES: Record<string, string> = {
  ECOPET: "ECOPETROL", "ECO PETROL": "ECOPETROL",
  IOC: "INDIAN OIL", IOCL: "INDIAN OIL",
  HPCL: "HINDUSTAN PETROLEUM", HINPET: "HINDUSTAN PETROLEUM",
  BPCL: "BHARAT PETROLEUM",
  "SHELL TRADING": "SHELL", STASCO: "SHELL",
  "BP OIL": "BP", "BP SHIPPING": "BP",
  "TOTAL ENERGIES": "TOTAL", TOTALENERGIES: "TOTAL",
  "VITOL SA": "VITOL", "VITOL ASIA": "VITOL",
  TRAF: "TRAFIGURA",
  RIL: "RELIANCE", "RELIANCE INDUSTRIES": "RELIANCE",
  "UNIPEC ASIA": "UNIPEC",
  PCIC: "PETROCHINA",
  SK: "SK ENERGY",
  "KOCH SUPPLY": "KOCH",
  "GUNVOR SA": "GUNVOR",
  "MERCURIA ENERGY": "MERCURIA",
  "LITASCO SA": "LITASCO",
  GLEN: "GLENCORE",
  "CEPSA TRADING": "CEPSA",
  "SAUDI ARAMCO": "ARAMCO", "ARAMCO TRADING": "ARAMCO",
  "ADNOC L&S": "ADNOC",
  "CHEVRON SHIPPING": "CHEVRON",
  EXXON: "EXXONMOBIL", MOBIL: "EXXONMOBIL",
};

// ---------- Helpers ----------

function normalisePort(port: string | null): string {
  if (!port) return "";
  const upper = port.trim().toUpperCase();
  const alias = PORT_ALIASES[upper];
  if (alias) return alias;
  // Title case fallback
  return port.trim().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\b(And|Of|The|In)\b/g, (w) => w.toLowerCase());
}

function normaliseCharterer(name: string | null): string {
  if (!name) return "";
  const upper = name.trim().toUpperCase();
  return CHARTERER_ALIASES[upper] ?? upper;
}

function parseRate(rate: string | null): { ws: number | null; lumpsum: number | null; display: string } {
  if (!rate) return { ws: null, lumpsum: null, display: "" };
  const r = rate.trim().toUpperCase();
  if (r === "RNR" || r === "TBN" || r === "-") return { ws: null, lumpsum: null, display: r };

  // WS range: W515-525 or WS515-525
  const wsRangeMatch = r.match(/^W[S]?\s?(\d+\.?\d*)\s?[-–]\s?(\d+\.?\d*)$/);
  if (wsRangeMatch) {
    const low = parseFloat(wsRangeMatch[1]);
    const high = parseFloat(wsRangeMatch[2]);
    return { ws: (low + high) / 2, lumpsum: null, display: `W${wsRangeMatch[1]}-${wsRangeMatch[2]}` };
  }

  // WS single: W54.25, WS467, WS 450, W317.5, WS317.5 — all normalised to same
  const wsMatch = r.match(/^W[S]?\s?(\d+\.?\d*)$/);
  if (wsMatch) return { ws: parseFloat(wsMatch[1]), lumpsum: null, display: `W${wsMatch[1]}` };

  // Lumpsum: $3.2M, $17.95M, $850K, 13.0M, 13M, $13,000,000
  const lsMatch = r.match(/^\$?([\d,]+\.?\d*)\s?(M|K)?$/i);
  if (lsMatch) {
    const val = parseFloat(lsMatch[1].replace(/,/g, ""));
    const unit = (lsMatch[2] ?? "").toUpperCase();
    let numeric = val;
    if (unit === "M") numeric = val * 1_000_000;
    else if (unit === "K") numeric = val * 1_000;
    // Normalise display: $13M not $13.0M, $17.95M stays
    const displayVal = numeric >= 1_000_000
      ? `$${(numeric / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`
      : `$${numeric.toLocaleString()}`;
    return { ws: null, lumpsum: numeric, display: displayVal };
  }

  return { ws: null, lumpsum: null, display: rate.trim() };
}

function statusRank(status: string | null): number {
  const s = (status ?? "").toUpperCase();
  if (s === "FIXED" || s === "FXD" || s === "FLD") return 3;
  if (s === "ON_SUBS" || s === "SUBS") return 2;
  if (s === "REPORTED" || s === "RPTD") return 1;
  return 0;
}

function formatStatus(status: string | null): string {
  const s = (status ?? "").toLowerCase();
  if (s === "fixed" || s === "fxd") return "FLD";
  if (s === "on_subs" || s === "subs") return "SUBS";
  if (s === "failed" || s === "fld") return "FLD";
  if (s === "withdrawn" || s === "wdrn") return "WDRN";
  return "-";
}

// ---------- Dedup key ----------

function fixtureKey(f: MarketRecord): string {
  const vessel = (f.vessel_name ?? "").trim().toLowerCase();
  const load = normalisePort(f.load_port).toLowerCase();
  const disch = normalisePort(f.discharge_port).toLowerCase();
  return `${vessel}|${load}|${disch}`;
}

// ---------- Types ----------

export interface NormalisedFixture {
  charterer: string;
  qty: string;
  cargo: string;
  laycan: string;
  load: string;
  discharge: string;
  vessel: string;
  rate: string;
  status: string;
  segment: string;
  // CRM-only flags (not shown in PDF)
  rateConflict: boolean;
  vesselTypeMismatch: boolean;
  possibleRepeat: boolean;
  sourceIds: string[];
}

export interface NormalisedReport {
  fixtures: Map<string, NormalisedFixture[]>; // segment -> fixtures
  flags: Map<string, string[]>; // fixtureKey -> list of flag descriptions
}

// ---------- Main normalisation ----------

export function normaliseForPdf(records: MarketRecord[], resolutions?: Resolution[]): NormalisedReport {
  // Build resolution lookup: vessel_name (lower) + field -> display_name
  const resolutionMap = new Map<string, string>();
  for (const r of resolutions ?? []) {
    if (r.display_name) {
      const key = `${r.vessel_name.trim().toLowerCase()}|${r.field_name}`;
      resolutionMap.set(key, r.display_name);
    }
  }

  const getResolved = (vesselName: string, field: string, fallback: string): string => {
    const key = `${vesselName.trim().toLowerCase()}|${field}`;
    return resolutionMap.get(key) ?? fallback;
  };

  const fixtureRecords = records.filter((r) => r.record_type === "FIXTURE" || !r.record_type);

  // Group by vessel+load+discharge (dedup key)
  const groups = new Map<string, MarketRecord[]>();
  for (const f of fixtureRecords) {
    const key = fixtureKey(f);
    if (!key.startsWith("|")) { // skip records with no vessel name
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    }
  }

  const result = new Map<string, NormalisedFixture[]>();
  const flags = new Map<string, string[]>();

  for (const [key, group] of groups) {
    // Sort by created_at desc (most recent first)
    group.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    const primary = group[0];
    const segment = primary.vessel_class ?? "Other";

    // Resolve charterer
    const charterer = normaliseCharterer(primary.charterer);

    // Resolve ports
    const load = normalisePort(primary.load_port);
    const discharge = normalisePort(primary.discharge_port);

    // Resolve rate — apply conflict rules
    const rates = group.map((f) => parseRate(f.rate_value));
    const wsRates = rates.filter((r) => r.ws != null);
    const lsRates = rates.filter((r) => r.lumpsum != null);
    let rateConflict = false;
    let finalRate: string;

    if (lsRates.length > 0 && wsRates.length > 0) {
      // WS vs LS: prefer lumpsum
      finalRate = lsRates[0].display;
      rateConflict = true;
    } else if (lsRates.length > 1) {
      // Multiple LS: use most recent (already sorted)
      finalRate = lsRates[0].display;
      if (lsRates[0].lumpsum !== lsRates[1].lumpsum) rateConflict = true;
    } else if (wsRates.length > 1) {
      // Multiple WS: average
      const avg = wsRates.reduce((s, r) => s + (r.ws ?? 0), 0) / wsRates.length;
      finalRate = `WS ${avg % 1 === 0 ? avg.toFixed(0) : avg.toFixed(2)}`;
      if (wsRates[0].ws !== wsRates[1].ws) rateConflict = true;
    } else if (lsRates.length === 1) {
      finalRate = lsRates[0].display;
    } else if (wsRates.length === 1) {
      finalRate = wsRates[0].display;
    } else {
      finalRate = rates[0]?.display ?? "";
    }

    // Resolve status — use highest rank, but flag Fixed→Subs regression
    let bestStatus = primary;
    let statusDiscrepancy = false;
    for (const f of group) {
      if (statusRank(f.fixture_status) > statusRank(bestStatus.fixture_status)) {
        bestStatus = f;
      }
    }
    // Check for Fixed→Subs regression
    const hasFixed = group.some((f) => statusRank(f.fixture_status) >= 3);
    const hasSubs = group.some((f) => {
      const s = (f.fixture_status ?? "").toLowerCase();
      return s === "on_subs" || s === "subs";
    });
    if (hasFixed && hasSubs) statusDiscrepancy = true;

    // Possible repeat detection
    const possibleRepeat = group.length > 1 && new Set(group.map((f) => f.report_source)).size === 1;

    // Build flags for CRM UI
    const keyFlags: string[] = [];
    if (rateConflict) keyFlags.push("Rate conflict resolved");
    if (statusDiscrepancy) keyFlags.push("Status regression: Fixed → Subs");
    if (possibleRepeat) keyFlags.push("Possible repeat fixture");
    if (keyFlags.length > 0) flags.set(key, keyFlags);

    // Apply resolution display_name overrides (user-chosen PDF display values)
    const vn = primary.vessel_name ?? "";
    const fixture: NormalisedFixture = {
      charterer: getResolved(vn, "charterer", charterer),
      qty: primary.quantity_mt ? (primary.quantity_mt / 1000).toFixed(0) : "",
      cargo: getResolved(vn, "cargo_grade", primary.cargo_grade ?? primary.cargo_type ?? ""),
      laycan: primary.raw_text ?? "",
      load: getResolved(vn, "load_port", load),
      discharge: getResolved(vn, "discharge_port", discharge),
      vessel: toTitleCase(primary.vessel_name ?? "TBN"),
      rate: getResolved(vn, "rate_value", finalRate),
      status: formatStatus(bestStatus.fixture_status),
      segment,
      rateConflict,
      vesselTypeMismatch: primary.vessel_type_mismatch ?? false,
      possibleRepeat,
      sourceIds: group.map((f) => f.id),
    };

    if (!result.has(segment)) result.set(segment, []);
    result.get(segment)!.push(fixture);
  }

  return { fixtures: result, flags };
}

function toTitleCase(s: string): string {
  return s.trim().replace(/\w\S*/g, (w) =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  );
}
