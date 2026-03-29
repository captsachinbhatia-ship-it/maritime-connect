// Fetches bunker prices from Ship & Bunker public page
// and stores them in market_data as BUNKER records.
// Can be called manually or via a cron trigger.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Ports we care about
const TARGET_PORTS = ["fujairah", "singapore", "rotterdam", "houston"];

interface BunkerPrice {
  region: string;
  vlsfo: number | null;
  vlsfo_change: number | null;
  ifo380: number | null;
  ifo380_change: number | null;
  mgo: number | null;
  mgo_change: number | null;
}

// Parse price and change from text like "$866.00" and "+5.50" or "-4.50"
function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[,$]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Extract bunker data from HTML
function parseBunkerHtml(html: string): BunkerPrice[] {
  const results: BunkerPrice[] = [];

  for (const port of TARGET_PORTS) {
    const portUpper = port.charAt(0).toUpperCase() + port.slice(1);

    // Look for price data in the HTML — Ship & Bunker uses table rows
    // We'll use regex to find price blocks for each port
    // The page structure has port names followed by price data

    // Try to find VLSFO, IFO380, MGO for this port
    // Pattern: port name appears near price values

    const portRegex = new RegExp(
      `${port}[\\s\\S]{0,2000}?(?=(?:${TARGET_PORTS.filter(p => p !== port).join("|")})|$)`,
      "i"
    );
    const portSection = html.match(portRegex)?.[0] ?? "";

    // Extract numbers that look like prices (3-4 digits, optional decimals)
    const pricePattern = /(\d{3,4}(?:\.\d{1,2})?)/g;
    const prices = [...portSection.matchAll(pricePattern)].map(m => parseFloat(m[1]));

    // Extract change values (+ or - followed by digits)
    const changePattern = /([+-]\s?\d+(?:\.\d{1,2})?)/g;
    const changes = [...portSection.matchAll(changePattern)].map(m =>
      parseFloat(m[1].replace(/\s/g, ""))
    );

    // Typical order on the page: VLSFO, MGO, IFO380 (or variations)
    // We'll try to map them based on typical price ranges:
    // VLSFO: 700-1000, IFO380: 500-800, MGO: 1000-2000
    const vlsfo = prices.find(p => p >= 700 && p <= 1000) ?? null;
    const ifo380 = prices.find(p => p >= 500 && p < 750 && p !== vlsfo) ?? null;
    const mgo = prices.find(p => p >= 1000 && p <= 2500) ?? null;

    results.push({
      region: portUpper.toUpperCase(),
      vlsfo,
      vlsfo_change: changes.length > 0 ? changes[0] : null,
      ifo380,
      ifo380_change: changes.length > 1 ? changes[1] : null,
      mgo,
      mgo_change: changes.length > 2 ? changes[2] : null,
    });
  }

  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date().toISOString().slice(0, 10);

    // Check if we already have bunker prices for today
    const { data: existing } = await supabase
      .from("market_data")
      .select("id")
      .eq("record_type", "BUNKER")
      .eq("report_source", "shipandbunker")
      .eq("report_date", today)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Bunker prices already fetched today", skipped: true }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Fetch the page
    const response = await fetch("https://shipandbunker.com/prices", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AQMaritime/1.0)",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Ship & Bunker: ${response.status}`);
    }

    const html = await response.text();

    // Try HTML parsing first
    let prices = parseBunkerHtml(html);

    // Use Claude if HTML parsing missed any port or any price field
    const hasFullData = prices.length === 4 && prices.every(p => p.vlsfo != null && p.ifo380 != null && p.mgo != null);
    if (!hasFullData) {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (ANTHROPIC_API_KEY) {
        // Extract text content (strip HTML tags)
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s{2,}/g, " ")
          .slice(0, 8000); // Limit for Haiku

        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 500,
            temperature: 0,
            messages: [{
              role: "user",
              content: `Extract bunker fuel prices from this Ship & Bunker page content for these ports: Fujairah, Singapore, Rotterdam, Houston.

For each port return: VLSFO price, VLSFO change, IFO380 price, IFO380 change, MGO price, MGO change.

Return ONLY valid JSON array:
[{"region":"FUJAIRAH","vlsfo":866,"vlsfo_change":5.5,"ifo380":709,"ifo380_change":15,"mgo":1710,"mgo_change":89}]

Page content:
${textContent}`,
            }],
          }),
        });

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const aiText = aiResult.content?.[0]?.text ?? "";
          const cleaned = aiText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          try {
            prices = JSON.parse(cleaned) as BunkerPrice[];
          } catch { /* keep original prices */ }
        }
      }
    }

    // Filter out ports with no data
    const validPrices = prices.filter(p => p.vlsfo !== null || p.ifo380 !== null || p.mgo !== null);

    if (validPrices.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not extract bunker prices" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Insert into market_data
    const rows = validPrices.map(p => ({
      report_source: "shipandbunker",
      report_date: today,
      report_type: "DPP", // bunker prices apply to both CPP and DPP
      record_type: "BUNKER",
      source_broker: "shipandbunker",
      bunker_region: p.region,
      vlsfo_price: p.vlsfo,
      vlsfo_change: p.vlsfo_change,
      ifo380_price: p.ifo380,
      ifo380_change: p.ifo380_change,
      mgo_price: p.mgo,
      mgo_change: p.mgo_change,
      pdf_filename: "shipandbunker.com",
    }));

    const { data, error } = await supabase
      .from("market_data")
      .insert(rows)
      .select("id");

    if (error) throw new Error(`Insert error: ${error.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted: data?.length ?? 0,
        prices: validPrices,
        date: today,
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-bunker-prices error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
