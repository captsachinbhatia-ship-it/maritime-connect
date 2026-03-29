/**
 * Merges multi-source fixture rows into a single row when discrepancies
 * have been resolved. Unresolved discrepancies keep all rows visible.
 */

import type { MarketRecord, Resolution } from "@/services/marketData";

function normalizeVesselKey(name: string | null): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*\(ex\..*?\)\s*/gi, "");
}

export interface MergedFixture extends MarketRecord {
  /** True if this row is a merge of multiple source rows */
  is_merged: boolean;
  /** Number of source rows that were merged */
  merged_count: number;
  /** Source names that contributed to this merged row */
  merged_sources: string[];
  /** Which fields were resolved by user */
  resolved_fields: string[];
}

export function mergeResolvedFixtures(
  fixtures: MarketRecord[],
  resolutions: Resolution[]
): MergedFixture[] {
  // Build resolution lookup: vesselKey → Map<fieldName, displayName|resolvedValue>
  const resMap = new Map<string, Map<string, { value: string | null; display: string | null }>>();
  for (const r of resolutions) {
    const vk = normalizeVesselKey(r.vessel_name);
    if (!resMap.has(vk)) resMap.set(vk, new Map());
    resMap.get(vk)!.set(r.field_name, {
      value: r.resolved_value,
      display: r.display_name,
    });
  }

  // Group fixtures by normalized vessel name
  const groups = new Map<string, MarketRecord[]>();
  const order: string[] = []; // preserve display order
  for (const f of fixtures) {
    if (f.record_type !== "FIXTURE" && f.record_type) continue;
    const vk = normalizeVesselKey(f.vessel_name);
    if (!vk || vk === "tbn" || vk === "tba") {
      // TBN rows always stay separate
      const key = `__solo_${f.id}`;
      groups.set(key, [f]);
      order.push(key);
      continue;
    }
    if (!groups.has(vk)) {
      groups.set(vk, []);
      order.push(vk);
    }
    groups.get(vk)!.push(f);
  }

  const result: MergedFixture[] = [];

  for (const vk of order) {
    const group = groups.get(vk)!;

    if (group.length <= 1) {
      // Single source — no merge needed
      result.push({
        ...group[0],
        is_merged: false,
        merged_count: 1,
        merged_sources: [group[0].report_source],
        resolved_fields: [],
      });
      continue;
    }

    // Multi-source — check if resolved
    const vResolutions = resMap.get(vk);
    const isResolved = vResolutions && vResolutions.size > 0;

    if (!isResolved) {
      // Not resolved — keep all rows visible (user needs to resolve)
      for (const f of group) {
        result.push({
          ...f,
          is_merged: false,
          merged_count: 1,
          merged_sources: [f.report_source],
          resolved_fields: [],
        });
      }
      continue;
    }

    // Resolved — merge into single row using most recent as base
    const sorted = [...group].sort((a, b) =>
      (b.created_at ?? "").localeCompare(a.created_at ?? "")
    );
    const base = { ...sorted[0] };
    const resolvedFieldNames: string[] = [];

    // Apply resolved values
    for (const [field, res] of vResolutions!) {
      if (field === "_remark") continue;
      const displayVal = res.display ?? res.value;
      if (!displayVal) continue;
      resolvedFieldNames.push(field);

      switch (field) {
        case "charterer": base.charterer = displayVal; break;
        case "cargo_grade": base.cargo_grade = displayVal; break;
        case "load_port": base.load_port = displayVal; break;
        case "discharge_port": base.discharge_port = displayVal; break;
        case "rate_value": base.rate_value = displayVal; break;
        case "fixture_status": base.fixture_status = displayVal; break;
      }
    }

    result.push({
      ...base,
      is_merged: true,
      merged_count: group.length,
      merged_sources: [...new Set(group.map((f) => f.report_source))],
      resolved_fields: resolvedFieldNames,
    });
  }

  // Add non-fixture records unchanged
  for (const f of fixtures) {
    if (f.record_type && f.record_type !== "FIXTURE") {
      result.push({
        ...f,
        is_merged: false,
        merged_count: 1,
        merged_sources: [f.report_source],
        resolved_fields: [],
      });
    }
  }

  return result;
}
