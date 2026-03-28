/**
 * Generates and caches one-line market commentary per section.
 * Uses Claude Haiku via Supabase edge function for speed.
 */

import { supabase } from "@/lib/supabaseClient";
import type { NormalisedFixture } from "@/lib/fixtureNormaliser";

interface Commentary {
  sectionKey: string;
  text: string;
}

export async function getCommentaryForSections(
  reportDate: string,
  reportType: string,
  sections: Map<string, NormalisedFixture[]>
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // Check cache first
  const { data: cached } = await supabase
    .from("report_section_commentary")
    .select("section_key, commentary")
    .eq("report_date", reportDate)
    .eq("report_type", reportType);

  const cacheMap = new Map<string, string>();
  for (const c of cached ?? []) {
    if (c.commentary) cacheMap.set(c.section_key, c.commentary);
  }

  const uncached: { key: string; fixtures: NormalisedFixture[] }[] = [];

  for (const [key, fixtures] of sections) {
    if (fixtures.length === 0) continue;
    if (cacheMap.has(key)) {
      result.set(key, cacheMap.get(key)!);
    } else {
      uncached.push({ key, fixtures });
    }
  }

  // Generate missing commentaries via edge function
  for (const { key, fixtures } of uncached) {
    try {
      const fixturesSummary = fixtures.slice(0, 10).map((f) =>
        `${f.charterer} ${f.qty}kt ${f.cargo} ${f.load}→${f.discharge} ${f.rate} ${f.status}`
      ).join("; ");

      const { data } = await supabase.functions.invoke("generate-commentary", {
        body: {
          section_name: key,
          fixtures_summary: fixturesSummary,
          report_type: reportType,
        },
      });

      const commentary = data?.commentary ?? "";
      if (commentary) {
        result.set(key, commentary);
        // Cache it
        await supabase.from("report_section_commentary").upsert({
          report_date: reportDate,
          report_type: reportType,
          section_key: key,
          commentary,
        }, { onConflict: "report_date,report_type,section_key" });
      }
    } catch {
      // Silently skip — never show error in PDF
    }
  }

  return result;
}
