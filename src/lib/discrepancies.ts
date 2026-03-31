import type { MarketFixture } from "@/services/marketData";
import { normalisePort, normaliseCharterer } from "@/lib/fixtureNormaliser";

export interface FieldDiscrepancy {
  field: string;
  values: Record<string, string | number | null>;
}

export interface VesselDiscrepancy {
  vesselKey: string;
  fixtureIds: string[];
  fields: FieldDiscrepancy[];
}

const COMPARE_FIELDS = [
  "charterer",
  "cargo_grade",
  "quantity_mt",
  "load_port",
  "discharge_port",
  "rate_value",
  "rate_numeric",
  "fixture_status",
] as const;

function normalizeVesselName(name: string | null): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\(ex\..*?\)\s*/gi, "");
}

/**
 * Detects cross-report discrepancies: same vessel reported by 2+ sources
 * on the same date with differing key fields.
 *
 * Returns two maps:
 * - vesselDiscrepancies: vesselKey -> VesselDiscrepancy
 * - fixtureFieldMap: fixtureId -> Set of field names that differ
 */
export function detectDiscrepancies(fixtures: MarketFixture[]): {
  vesselDiscrepancies: Map<string, VesselDiscrepancy>;
  fixtureFieldMap: Map<string, Set<string>>;
} {
  const vesselDiscrepancies = new Map<string, VesselDiscrepancy>();
  const fixtureFieldMap = new Map<string, Set<string>>();

  // Group by normalized vessel name
  const groups = new Map<string, MarketFixture[]>();
  for (const f of fixtures) {
    const key = normalizeVesselName(f.vessel_name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }

  for (const [vesselKey, group] of groups) {
    // Only care about vessels appearing in 2+ different sources
    const sources = new Set(group.map((f) => f.report_source));
    if (sources.size < 2) continue;

    // Pick one fixture per source (first one)
    const bySource = new Map<string, MarketFixture>();
    for (const f of group) {
      if (!bySource.has(f.report_source)) bySource.set(f.report_source, f);
    }

    // Compare fields across sources
    const discrepantFields: FieldDiscrepancy[] = [];
    for (const field of COMPARE_FIELDS) {
      const values: Record<string, string | number | null> = {};
      for (const [src, f] of bySource) {
        values[src] = (f as unknown as Record<string, unknown>)[field] as
          | string
          | number
          | null;
      }
      const unique = new Set(
        Object.values(values).map((v) => {
          if (v == null) return "__null__";
          const s = String(v).trim();
          // Normalise ports and charterers before comparing
          if (field === "load_port" || field === "discharge_port") return normalisePort(s).toLowerCase();
          if (field === "charterer") return normaliseCharterer(s).toLowerCase();
          return s.toLowerCase();
        })
      );
      if (unique.size > 1) {
        discrepantFields.push({ field, values });
      }
    }

    if (discrepantFields.length === 0) continue;

    const fixtureIds = group.map((f) => f.id);
    const fieldNameSet = new Set(discrepantFields.map((d) => d.field));

    vesselDiscrepancies.set(vesselKey, {
      vesselKey,
      fixtureIds,
      fields: discrepantFields,
    });

    for (const id of fixtureIds) {
      fixtureFieldMap.set(id, fieldNameSet);
    }
  }

  return { vesselDiscrepancies, fixtureFieldMap };
}
