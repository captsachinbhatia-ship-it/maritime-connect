/**
 * Pre-PDF normalisation: field extraction, dedup, rate conflict resolution,
 * alias application. Runs client-side before PDF generation. Does NOT modify DB.
 */

import type { MarketRecord, Resolution } from "@/services/marketData";

// ── Port aliases ──────────────────────────────────────────────
const PORT_ALIASES: Record<string, string> = {
  SPORE: "Singapore", SIN: "Singapore", SGP: "Singapore", "S'PORE": "Singapore",
  OZ: "Australia", AUS: "Australia", AUSSIE: "Australia",
  AG: "Middle East Gulf", "ARABIAN GULF": "Middle East Gulf", "PERSIAN GULF": "Middle East Gulf",
  MEG: "Middle East Gulf",
  FUJ: "Fujairah", FUJI: "Fujairah",
  RT: "Ras Tanura", RASTANURA: "Ras Tanura",
  JA: "Jebel Ali", BASRAH: "Basra", BSR: "Basra", JBL: "Jubail",
  "FAR EAST": "Far East", FE: "Far East", FEAST: "Far East",
  EAST: "Far East",
  IND: "India", BOMBAY: "Mumbai", MUM: "Mumbai",
  "N.MANG": "New Mangalore", NMANG: "New Mangalore",
  RDAM: "Rotterdam", RTM: "Rotterdam", AMS: "Amsterdam",
  UKC: "UK Continent", "UK CONTINENT": "UK Continent", "UK-CONT": "UK Continent",
  UKCM: "UK Continent-Med",
  MED: "Mediterranean", MEDITERRANEAN: "Mediterranean",
  WAF: "West Africa", WAFR: "West Africa", "WEST AFRICA": "West Africa",
  LOS: "Lagos", BNNY: "Bonny",
  USG: "US Gulf", USGC: "US Gulf", "US GULF": "US Gulf", HOU: "Houston",
  CARIBS: "Caribbean", CARIBBEAN: "Caribbean", CARIB: "Caribbean",
  ECSA: "East Coast S. America", "EAST COAST SOUTH AMERICA": "East Coast S. America",
  BRZ: "Brazil", BRZL: "Brazil",
  BSEA: "Black Sea", "BLACK SEA": "Black Sea", BLSEA: "Black Sea",
  NOVO: "Novorossiysk", NVRS: "Novorossiysk",
  RSEA: "Red Sea", "RED SEA": "Red Sea", REDSEA: "Red Sea",
  "E.AFRICA": "East Africa", "EAFRICA": "East Africa",
  "S.AFRICA": "South Africa", "SAFRICA": "South Africa",
  PHILI: "Philippines", PHIL: "Philippines",
  SKOREA: "South Korea", "S.KOREA": "South Korea", SKOR: "South Korea", KOREA: "South Korea",
  HKG: "Hong Kong", HONGKONG: "Hong Kong", "HONG KONG": "Hong Kong",
  JPN: "Japan", TWN: "Taiwan",
  YOKO: "Yokohama", CHB: "Chiba",
};

// ── Charterer aliases ─────────────────────────────────────────
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
  "UNIPEC ASIA": "UNIPEC", PCIC: "PETROCHINA",
  SK: "SK ENERGY", "KOCH SUPPLY": "KOCH",
  "GUNVOR SA": "GUNVOR", "MERCURIA ENERGY": "MERCURIA",
  "LITASCO SA": "LITASCO", GLEN: "GLENCORE",
  "CEPSA TRADING": "CEPSA", "PERTAMINA ENERGY": "PERTAMINA",
  "SAUDI ARAMCO": "ARAMCO", "ARAMCO TRADING": "ARAMCO",
  "ADNOC L&S": "ADNOC", "CHEVRON SHIPPING": "CHEVRON",
  EXXON: "EXXONMOBIL", MOBIL: "EXXONMOBIL",
  "MITSUI & CO": "MITSUI", "CARGILL OIL": "CARGILL",
  "COSMO OIL": "COSMO", JXTG: "ENEOS",
};

// ── Cargo code extraction ─────────────────────────────────────
const CARGO_CODES = [
  "NHC", "HC", "FO", "COND", "LSFO", "NAP", "CPP", "ULSD",
  "UMS", "GOIL", "GO", "UNL", "CR", "DPP", "HSFO", "VGO",
  "MOGAS", "JET", "NAPHTHA", "GASOIL", "BITUMEN", "CONDENSATE",
  "METHANOL", "BENZENE", "FUEL OIL",
];

const CARGO_FULL_TO_CODE: Record<string, string> = {
  "NON HEAVY CRUDE": "NHC", "HEAVY CRUDE": "HC", "FUEL OIL": "FO",
  "CONDENSATE": "COND", "LOW SULPHUR FUEL OIL": "LSFO",
  "NAPHTHA": "NAP", "GASOIL": "GO", "CRUDE": "NHC",
};

function extractCargoCode(raw: string | null): string {
  if (!raw) return "";
  const upper = raw.trim().toUpperCase();
  // Check full name first
  for (const [full, code] of Object.entries(CARGO_FULL_TO_CODE)) {
    if (upper.includes(full)) return code;
  }
  // Check abbreviations
  for (const code of CARGO_CODES) {
    if (upper === code || upper.includes(code)) return code;
  }
  return raw.trim();
}

// ── Laycan formatting ─────────────────────────────────────────
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format laycan from DB date fields or extract from raw text */
function formatLaycan(laycanFrom: string | null, laycanTo: string | null, raw: string | null): string {
  // Try DB date fields first (YYYY-MM-DD format)
  if (laycanFrom) {
    const from = new Date(laycanFrom + "T00:00:00");
    const dFrom = from.getDate();
    const mFrom = MONTH_NAMES[from.getMonth()];
    if (laycanTo && laycanTo !== laycanFrom) {
      const to = new Date(laycanTo + "T00:00:00");
      const dTo = to.getDate();
      const mTo = MONTH_NAMES[to.getMonth()];
      if (mFrom === mTo) return `${dFrom}-${dTo}/${mFrom}`;
      return `${dFrom}/${mFrom}-${dTo}/${mTo}`;
    }
    return `${dFrom}/${mFrom}`;
  }

  // Fallback: extract from raw text
  if (!raw) return "";
  const s = raw.trim();
  const dateMatch = s.match(
    /(?:Ely\s+\w+|Early\s+\w+|\d{1,2}(?:\s*[-–]\s*\d{1,2})?\s*\/\s*[A-Za-z]{3,}|\d{1,2}\s*-\s*[A-Za-z]{3}|DNR)/i
  );
  if (dateMatch) {
    return dateMatch[0].replace(
      /\/([A-Z]{3,})/i,
      (_, m: string) => `/${m.charAt(0).toUpperCase()}${m.slice(1).toLowerCase()}`
    ).replace(
      /-([A-Z]{3})/i,
      (_, m: string) => `-${m.charAt(0).toUpperCase()}${m.slice(1).toLowerCase()}`
    );
  }
  if (s.length <= 12) return s;
  return "";
}

// ── Rate parsing ──────────────────────────────────────────────
export interface ParsedRate {
  ws: number | null;
  lumpsum: number | null;
  display: string;
  demurrage: string | null;
}

function parseRate(rate: string | null): ParsedRate {
  if (!rate) return { ws: null, lumpsum: null, display: "", demurrage: null };
  let r = rate.trim();

  // Extract demurrage: DEM 275K or DEM 275,000
  let demurrage: string | null = null;
  const demMatch = r.match(/DEM\s+([\d,]+)\s*K?/i);
  if (demMatch) {
    demurrage = `DEM ${demMatch[1]}${demMatch[0].toUpperCase().includes("K") ? "K" : ""}`;
    r = r.replace(demMatch[0], "").trim();
  }

  const u = r.toUpperCase();
  if (u === "RNR" || u === "TBN" || u === "-" || u === "DNR")
    return { ws: null, lumpsum: null, display: u, demurrage };

  // Dual rate: W295-7.0M or W295-$7.0M (WS + lumpsum in one string)
  // Lumpsum wins per resolution rule
  const dualMatch = u.match(/^W[S]?\s?(\d+\.?\d*)\s*[-–]\s*\$?(\d+\.?\d*)\s*M$/);
  if (dualMatch) {
    const wsVal = parseFloat(dualMatch[1]);
    const lsVal = parseFloat(dualMatch[2]) * 1_000_000;
    const displayVal = `$${(lsVal / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
    return { ws: wsVal, lumpsum: lsVal, display: displayVal, demurrage };
  }

  // Multi-leg with lumpsum: W295-W450-$7.0M — extract lumpsum
  const multiMatch = u.match(/\$(\d+\.?\d*)\s*M/);
  if (multiMatch && u.startsWith("W")) {
    const lsVal = parseFloat(multiMatch[1]) * 1_000_000;
    const wsFirstMatch = u.match(/^W[S]?\s?(\d+\.?\d*)/);
    const wsVal = wsFirstMatch ? parseFloat(wsFirstMatch[1]) : null;
    const displayVal = `$${(lsVal / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
    return { ws: wsVal, lumpsum: lsVal, display: displayVal, demurrage };
  }

  // WS range: W515-525 or WS515-525 (both numbers are WS — no M suffix)
  const wsRangeMatch = u.match(/^W[S]?\s?(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)$/);
  if (wsRangeMatch) {
    const low = parseFloat(wsRangeMatch[1]);
    const high = parseFloat(wsRangeMatch[2]);
    return { ws: (low + high) / 2, lumpsum: null, display: `W${wsRangeMatch[1]}-${wsRangeMatch[2]}`, demurrage };
  }

  // WS single: W54.25, WS467, WS 450
  const wsMatch = u.match(/^W[S]?\s?(\d+\.?\d*)$/);
  if (wsMatch) return { ws: parseFloat(wsMatch[1]), lumpsum: null, display: `W${wsMatch[1]}`, demurrage };

  // Lumpsum: $3.2M, $17.95M, $850K, 13.0M, $13,000,000
  const lsMatch = u.match(/^\$?([\d,]+\.?\d*)\s?(M|K)?$/i);
  if (lsMatch) {
    const val = parseFloat(lsMatch[1].replace(/,/g, ""));
    const unit = (lsMatch[2] ?? "").toUpperCase();
    let numeric = val;
    if (unit === "M") numeric = val * 1_000_000;
    else if (unit === "K") numeric = val * 1_000;
    const displayVal = numeric >= 1_000_000
      ? `$${(numeric / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`
      : `$${numeric.toLocaleString()}`;
    return { ws: null, lumpsum: numeric, display: displayVal, demurrage };
  }

  return { ws: null, lumpsum: null, display: r, demurrage };
}

// ── Status helpers ────────────────────────────────────────────
function statusRank(status: string | null): number {
  const s = (status ?? "").toUpperCase();
  if (["FIXED", "FXD", "FLD", "RPTD FLD"].includes(s)) return 3;
  if (["ON_SUBS", "SUBS", "ON SUBS"].includes(s)) return 2;
  if (["HOLD"].includes(s)) return 1;
  if (["REPORTED", "RPTD"].includes(s)) return 1;
  return 0;
}

export function formatStatus(status: string | null): string {
  if (!status) return "-";
  const s = status.trim().toUpperCase();
  if (["FIXED", "FXD", "RPTD FLD"].includes(s)) return "FLD";
  if (["ON_SUBS", "SUBS", "ON SUBS"].includes(s)) return "SUBS";
  if (["FAILED", "FLD"].includes(s)) return "FLD";
  if (["HOLD"].includes(s)) return "HOLD";
  if (["CORR"].includes(s)) return "CORR";
  if (["OLD"].includes(s)) return "OLD";
  if (["WITHDRAWN", "WDRN"].includes(s)) return "WDRN";
  return "-";
}

// ── Port normalisation ────────────────────────────────────────
export function normalisePort(port: string | null): string {
  if (!port) return "";
  const upper = port.trim().toUpperCase();
  const alias = PORT_ALIASES[upper];
  if (alias) return alias;
  return port.trim().replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(And|Of|The|In)\b/g, (w) => w.toLowerCase());
}

export function normaliseCharterer(name: string | null): string {
  if (!name) return "";
  const upper = name.trim().toUpperCase();
  return CHARTERER_ALIASES[upper] ?? upper;
}

// ── Qty extraction ────────────────────────────────────────────
function extractQty(qtyMt: number | null, raw: string | null): string {
  if (qtyMt && qtyMt > 0) return (qtyMt / 1000).toFixed(0);
  if (!raw) return "";
  const match = raw.match(/(\d+)\s*(?:x\s*\d+\s*)?(?:NHC|HC|FO|COND|LSFO|NAP|CPP|ULSD|UMS|GOIL|GO|UNL|CR|MT|KT)/i);
  if (match) return match[1];
  return "";
}

// ── Dedup key ─────────────────────────────────────────────────
function fixtureKey(f: MarketRecord): string {
  const vessel = (f.vessel_name ?? "").trim().toLowerCase();
  const load = normalisePort(f.load_port).toLowerCase();
  const disch = normalisePort(f.discharge_port).toLowerCase();
  return `${vessel}|${load}|${disch}`;
}

// ── Trade region inference (for clean report grouping) ────────
const MEG_RSEA_INDIA_PORTS = new Set([
  "middle east gulf", "meg", "fujairah", "ras tanura", "jubail",
  "jebel ali", "basra", "india", "mumbai", "new mangalore", "sikka",
  "red sea", "rsea", "jeddah", "yanbu", "sohar", "muscat",
]);
const SE_FE_ASIA_PORTS = new Set([
  "singapore", "far east", "japan", "south korea", "china",
  "taiwan", "yokohama", "chiba", "philippines", "thailand",
  "vietnam", "indonesia", "malaysia", "busan",
]);
const MED_UKC_WAFR_PORTS = new Set([
  "uk continent", "uk continent-med", "mediterranean", "rotterdam",
  "amsterdam", "west africa", "lagos", "bonny", "houston", "us gulf",
  "caribbean", "brazil", "east coast s. america", "black sea",
  "novorossiysk", "east africa", "south africa",
]);

export function inferTradeRegion(load: string, discharge: string): string {
  const l = load.toLowerCase();
  const d = discharge.toLowerCase();
  // Cross Singapore
  if (l.includes("singapore") && d.includes("singapore")) return "CROSS SINGAPORE";
  // Check load port primarily
  for (const p of [l, d]) {
    if ([...MEG_RSEA_INDIA_PORTS].some((k) => p.includes(k))) return "MEG - RSEA - INDIA";
    if ([...SE_FE_ASIA_PORTS].some((k) => p.includes(k))) return "SOUTHEAST-FAR EAST ASIA";
    if ([...MED_UKC_WAFR_PORTS].some((k) => p.includes(k))) return "MED-UKC-WAFR";
  }
  return "OTHER";
}

// ── Types ─────────────────────────────────────────────────────
export interface NormalisedFixture {
  charterer: string;
  qty: string;
  cargo: string;
  laycan: string;
  load: string;
  discharge: string;
  vessel: string;
  rate: string;
  demurrage: string | null;
  status: string;
  segment: string;
  tradeRegion: string;
  rateConflict: boolean;
  vesselTypeMismatch: boolean;
  possibleRepeat: boolean;
  sourceIds: string[];
}

export interface NormalisedReport {
  fixtures: Map<string, NormalisedFixture[]>;
  enquiries: NormalisedFixture[];
  flags: Map<string, string[]>;
}

// ── Main normalisation ────────────────────────────────────────
export function normaliseForPdf(records: MarketRecord[], resolutions?: Resolution[]): NormalisedReport {
  const resolutionMap = new Map<string, string>();
  for (const r of resolutions ?? []) {
    if (r.display_name) {
      resolutionMap.set(`${r.vessel_name.trim().toLowerCase()}|${r.field_name}`, r.display_name);
    }
  }
  const getResolved = (vn: string, field: string, fallback: string): string =>
    resolutionMap.get(`${vn.trim().toLowerCase()}|${field}`) ?? fallback;

  const fixtureRecords = records.filter((r) => r.record_type === "FIXTURE" || !r.record_type);
  const enquiryRecords = records.filter((r) => r.record_type === "ENQUIRY");

  // Group fixtures by vessel+load+discharge
  const groups = new Map<string, MarketRecord[]>();
  for (const f of fixtureRecords) {
    const key = fixtureKey(f);
    if (!key.startsWith("|")) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(f);
    }
  }

  const result = new Map<string, NormalisedFixture[]>();
  const flags = new Map<string, string[]>();

  for (const [key, group] of groups) {
    group.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    const primary = group[0];
    const segment = primary.vessel_class ?? "Other";
    const charterer = normaliseCharterer(primary.charterer);
    const load = normalisePort(primary.load_port);
    const discharge = normalisePort(primary.discharge_port);
    const tradeRegion = inferTradeRegion(load, discharge);

    // Rate conflict resolution
    const rates = group.map((f) => parseRate(f.rate_value));
    const wsRates = rates.filter((r) => r.ws != null);
    const lsRates = rates.filter((r) => r.lumpsum != null);
    let rateConflict = false;
    let finalRate: string;
    let demurrage = rates.find((r) => r.demurrage)?.demurrage ?? null;

    if (lsRates.length > 0 && wsRates.length > 0) {
      finalRate = lsRates[0].display;
      rateConflict = true;
    } else if (lsRates.length > 1) {
      finalRate = lsRates[0].display;
      if (lsRates[0].lumpsum !== lsRates[1].lumpsum) rateConflict = true;
    } else if (wsRates.length > 1) {
      const avg = wsRates.reduce((s, r) => s + (r.ws ?? 0), 0) / wsRates.length;
      finalRate = `W${avg % 1 === 0 ? avg.toFixed(0) : avg.toFixed(2)}`;
      if (wsRates[0].ws !== wsRates[1].ws) rateConflict = true;
    } else if (lsRates.length === 1) {
      finalRate = lsRates[0].display;
    } else if (wsRates.length === 1) {
      finalRate = wsRates[0].display;
    } else {
      finalRate = rates[0]?.display ?? "";
    }

    // Status resolution
    let bestStatus = primary;
    for (const f of group) {
      if (statusRank(f.fixture_status) > statusRank(bestStatus.fixture_status)) bestStatus = f;
    }
    const hasFixed = group.some((f) => statusRank(f.fixture_status) >= 3);
    const hasSubs = group.some((f) => ["on_subs", "subs"].includes((f.fixture_status ?? "").toLowerCase()));
    const statusDiscrepancy = hasFixed && hasSubs;
    const possibleRepeat = group.length > 1 && new Set(group.map((f) => f.report_source)).size === 1;

    const keyFlags: string[] = [];
    if (rateConflict) keyFlags.push("Rate conflict resolved");
    if (statusDiscrepancy) keyFlags.push("Status regression: Fixed → Subs");
    if (possibleRepeat) keyFlags.push("Possible repeat fixture");
    if (keyFlags.length > 0) flags.set(key, keyFlags);

    const vn = primary.vessel_name ?? "";
    const fixture: NormalisedFixture = {
      charterer: getResolved(vn, "charterer", charterer),
      qty: extractQty(primary.quantity_mt, primary.raw_text),
      cargo: extractCargoCode(getResolved(vn, "cargo_grade", primary.cargo_grade ?? primary.cargo_type ?? "")),
      laycan: formatLaycan(primary.laycan_from, primary.laycan_to, primary.raw_text),
      load: getResolved(vn, "load_port", load),
      discharge: getResolved(vn, "discharge_port", discharge),
      vessel: (primary.vessel_name ?? "TBN").toUpperCase(),
      rate: getResolved(vn, "rate_value", finalRate),
      demurrage,
      status: formatStatus(bestStatus.fixture_status),
      segment,
      tradeRegion,
      rateConflict,
      vesselTypeMismatch: primary.vessel_type_mismatch ?? false,
      possibleRepeat,
      sourceIds: group.map((f) => f.id),
    };

    if (!result.has(segment)) result.set(segment, []);
    result.get(segment)!.push(fixture);
  }

  // Normalise enquiries
  const enquiries: NormalisedFixture[] = enquiryRecords.map((e) => ({
    charterer: normaliseCharterer(e.charterer).toUpperCase(),
    qty: extractQty(e.quantity_mt, e.raw_text),
    cargo: extractCargoCode(e.cargo_grade ?? e.cargo_type ?? ""),
    laycan: formatLaycan(e.laycan_from, e.laycan_to, e.raw_text),
    load: normalisePort(e.load_port),
    discharge: normalisePort(e.discharge_port),
    vessel: "",
    rate: "",
    demurrage: null,
    status: "-",
    segment: e.vessel_class ?? "Other",
    tradeRegion: inferTradeRegion(normalisePort(e.load_port), normalisePort(e.discharge_port)),
    rateConflict: false,
    vesselTypeMismatch: false,
    possibleRepeat: false,
    sourceIds: [e.id],
  }));

  return { fixtures: result, enquiries, flags };
}
