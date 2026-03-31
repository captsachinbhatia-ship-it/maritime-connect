/**
 * Groups market_data fixture rows by normalised vessel name.
 * Produces a merged "master" row per group using resolution data or auto-resolve.
 * Singles (only one source) pass through unchanged.
 */

import type { MarketRecord, Resolution } from "@/services/marketData";

// Fields we compare across broker reports
export const CONFLICT_FIELDS = [
  "charterer",
  "cargo_grade",
  "quantity_mt",
  "load_port",
  "discharge_port",
  "rate_value",
  "fixture_status",
] as const;

export type ConflictField = (typeof CONFLICT_FIELDS)[number];

const STATUS_PRIORITY: Record<string, number> = {
  fixed: 3,
  on_subs: 2,
  reported: 1,
  failed: 0,
  withdrawn: 0,
};

const FIELD_LABEL: Record<string, string> = {
  charterer: "Charterer",
  cargo_grade: "Cargo",
  quantity_mt: "Quantity",
  load_port: "Load Port",
  discharge_port: "Disch Port",
  rate_value: "Rate",
  fixture_status: "Status",
};

export { FIELD_LABEL };

export interface FixtureGroup {
  vesselKey: string;
  vesselName: string;
  fixtures: MarketRecord[];
  /** field → true if brokers disagree */
  conflicts: Partial<Record<ConflictField, boolean>>;
  /** field → resolved value (from market_data_resolutions or auto) */
  resolved: Partial<Record<ConflictField, string>>;
  /** field → display_name override for PDF */
  displayNames: Partial<Record<ConflictField, string>>;
  /** computed merged row using resolutions, falling back to auto-resolve */
  merged: MarketRecord;
  unresolvedCount: number;
  sourceCount: number;
  sources: string[];
}

function normalizeVesselName(name: string | null): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\(ex\..*?\)\s*/gi, "");
}

function fieldVal(rec: MarketRecord, field: ConflictField): string | null {
  const v = (rec as unknown as Record<string, unknown>)[field];
  if (v == null) return null;
  return String(v).trim() || null;
}

/** Is this a user-edited or manually entered record? */
function isUserEdited(f: MarketRecord): boolean {
  return f.report_source === "aq_manual" ||
    f.report_source === "aq_maritime" ||
    (f.updated_at != null && f.updated_at !== f.created_at);
}

/**
 * Auto-resolve a single conflict field.
 * Priority: user-edited record > status priority (for status field) > most recently updated
 */
function autoResolveField(
  field: ConflictField,
  fixtures: MarketRecord[]
): MarketRecord | null {
  const candidates = fixtures.filter((f) => fieldVal(f, field) != null);
  if (candidates.length === 0) return null;

  // User-edited records always win
  const edited = candidates.filter(isUserEdited);
  if (edited.length > 0) return edited[0];

  if (field === "fixture_status") {
    return candidates.reduce((best, cur) => {
      const bestPrio = STATUS_PRIORITY[(fieldVal(best, field) ?? "").toLowerCase()] ?? 0;
      const curPrio = STATUS_PRIORITY[(fieldVal(cur, field) ?? "").toLowerCase()] ?? 0;
      return curPrio > bestPrio ? cur : best;
    });
  }

  // Most recently updated wins, then most recent created_at
  return candidates.sort((a, b) => {
    const aTime = a.updated_at ?? a.created_at ?? "";
    const bTime = b.updated_at ?? b.created_at ?? "";
    return bTime.localeCompare(aTime);
  })[0];
}

/**
 * Build resolution map from existing market_data_resolutions.
 * Key: normalised vessel_name, Value: field → { resolved_value, display_name }
 */
export function buildResolutionMap(
  resolutions: Resolution[]
): Map<string, Map<string, { resolvedValue: string | null; displayName: string | null }>> {
  const map = new Map<string, Map<string, { resolvedValue: string | null; displayName: string | null }>>();
  for (const r of resolutions) {
    const key = normalizeVesselName(r.vessel_name);
    if (!map.has(key)) map.set(key, new Map());
    map.get(key)!.set(r.field_name, {
      resolvedValue: r.resolved_value,
      displayName: r.display_name,
    });
  }
  return map;
}

/**
 * Group fixtures by vessel name.
 * Returns singles (1 source) and groups (2+ sources).
 */
export function groupFixtures(
  fixtures: MarketRecord[],
  resolutions: Resolution[]
): { singles: MarketRecord[]; groups: FixtureGroup[] } {
  const resMap = buildResolutionMap(resolutions);

  // Group by vessel name first, then split if fixtures are clearly different
  // (different charterer AND different route = separate fixtures, not broker discrepancies)
  const byVesselRaw = new Map<string, MarketRecord[]>();
  for (const f of fixtures) {
    if (f.record_type && f.record_type !== "FIXTURE") continue;
    const vesselKey = normalizeVesselName(f.vessel_name);
    if (!vesselKey || vesselKey === "tbn" || vesselKey === "tba") {
      byVesselRaw.set(`__tbn_${f.id}`, [f]);
      continue;
    }
    if (!byVesselRaw.has(vesselKey)) byVesselRaw.set(vesselKey, []);
    byVesselRaw.get(vesselKey)!.push(f);
  }

  // Split vessel groups where fixtures are clearly different deals
  const byVessel = new Map<string, MarketRecord[]>();
  for (const [vesselKey, group] of byVesselRaw) {
    if (group.length <= 1 || vesselKey.startsWith("__tbn_")) {
      byVessel.set(vesselKey, group);
      continue;
    }
    // Cluster by charterer similarity — different charterer + different load = separate fixture
    const clusters: MarketRecord[][] = [];
    for (const f of group) {
      const charterer = (f.charterer ?? "").trim().toLowerCase();
      const load = (f.load_port ?? "").trim().toLowerCase();
      let placed = false;
      for (const cluster of clusters) {
        const ref = cluster[0];
        const refCharterer = (ref.charterer ?? "").trim().toLowerCase();
        const refLoad = (ref.load_port ?? "").trim().toLowerCase();
        // Same fixture if charterer matches OR load port matches (brokers may differ on one)
        if (charterer && refCharterer && charterer === refCharterer) { cluster.push(f); placed = true; break; }
        if (load && refLoad && load === refLoad) { cluster.push(f); placed = true; break; }
        // Both empty — group together
        if (!charterer && !refCharterer) { cluster.push(f); placed = true; break; }
      }
      if (!placed) clusters.push([f]);
    }
    if (clusters.length === 1) {
      byVessel.set(vesselKey, group);
    } else {
      clusters.forEach((cluster, i) => {
        byVessel.set(`${vesselKey}__${i}`, cluster);
      });
    }
  }

  const singles: MarketRecord[] = [];
  const groups: FixtureGroup[] = [];

  for (const [vesselKey, group] of byVessel) {
    if (group.length === 1) {
      singles.push(group[0]);
      continue;
    }

    // Multiple reports for same vessel — detect conflicts
    const conflicts: Partial<Record<ConflictField, boolean>> = {};
    for (const field of CONFLICT_FIELDS) {
      const values = new Set(
        group.map((f) => (fieldVal(f, field) ?? "__null__").toLowerCase())
      );
      // Exclude null-only sets
      values.delete("__null__");
      if (values.size > 1) {
        conflicts[field] = true;
      }
    }

    // Build resolved values from existing resolutions + auto-resolve
    const resolved: Partial<Record<ConflictField, string>> = {};
    const displayNames: Partial<Record<ConflictField, string>> = {};
    const vesselResolutions = resMap.get(vesselKey);

    for (const field of CONFLICT_FIELDS) {
      // Check if user already resolved this field
      const userRes = vesselResolutions?.get(field);
      if (userRes?.resolvedValue) {
        resolved[field] = userRes.resolvedValue;
        if (userRes.displayName) displayNames[field] = userRes.displayName;
        continue;
      }
      if (userRes?.displayName) {
        displayNames[field] = userRes.displayName;
      }

      // Auto-resolve: pick best value
      const best = autoResolveField(field, group);
      if (best) {
        const val = fieldVal(best, field);
        if (val) resolved[field] = val;
      }
    }

    // Count unresolved conflicts (conflicts without user resolution)
    const unresolvedCount = (Object.keys(conflicts) as ConflictField[]).filter(
      (f) => !vesselResolutions?.has(f)
    ).length;

    // Build merged row: user-edited records first, then most recently updated
    const sorted = [...group].sort((a, b) => {
      // User-edited records always come first
      const aEdited = isUserEdited(a) ? 1 : 0;
      const bEdited = isUserEdited(b) ? 1 : 0;
      if (bEdited !== aEdited) return bEdited - aEdited;
      // Then by most recently updated
      const aTime = a.updated_at ?? a.created_at ?? "";
      const bTime = b.updated_at ?? b.created_at ?? "";
      return bTime.localeCompare(aTime);
    });
    const merged: MarketRecord = { ...sorted[0] };
    for (const field of CONFLICT_FIELDS) {
      if (resolved[field] != null) {
        (merged as unknown as Record<string, unknown>)[field] = resolved[field];
      } else if (fieldVal(merged, field) == null) {
        // Fill null from any fixture that has a value
        const donor = group.find((f) => fieldVal(f, field) != null);
        if (donor) {
          (merged as unknown as Record<string, unknown>)[field] = fieldVal(donor, field);
        }
      }
    }

    const sources = [...new Set(group.map((f) => f.report_source))];

    groups.push({
      vesselKey,
      vesselName: group[0].vessel_name ?? "Unknown",
      fixtures: group,
      conflicts,
      resolved,
      displayNames,
      merged,
      unresolvedCount,
      sourceCount: sources.length,
      sources,
    });
  }

  return { singles, groups };
}
