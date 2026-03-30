// Fetches crude oil & energy commodity prices from oilprice.com
// and stores them in market_data as OIL_PRICE records.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Key benchmarks we want to track
const TARGET_COMMODITIES = [
  "WTI Crude",
  "Brent Crude",
  "Murban Crude",
  "Natural Gas",
  "Gasoline",
  "Heating Oil",
  "OPEC Basket",
  "Dubai",
  "DME Oman",
  "Mars",
  "LNG Japan/Korea Marker",
];

interface OilPrice {
  name: string;
  price: number | null;
  change: number | null;
  change_pct: number | null;
}

function parseOilPricesHtml(html: string): OilPrice[] {
  const results: OilPrice[] = [];

  for (const commodity of TARGET_COMMODITIES) {
    // Look for the commodity name followed by price data in table rows
    // Patterns: "WTI Crude" then numbers like 101.64, +2.00, +2.01%
    const escaped = commodity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `${escaped}[\\s\\S]{0,500}?(\\d+\\.\\d{1,3})\\s*[\\s\\S]{0,100}?([+-]?\\d+\\.\\d{1,3})\\s*[\\s\\S]{0,50}?([+-]?\\d+\\.\\d{1,2})%`,
      "i"
    );
    const match = html.match(regex);

    if (match) {
      results.push({
        name: commodity,
        price: parseFloat(match[1]) || null,
        change: parseFloat(match[2]) || null,
        change_pct: parseFloat(match[3]) || null,
      });
    }
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

    // Check if we already have oil prices for today
    const { data: existing } = await supabase
      .from("market_data")
      .select("id")
      .eq("record_type", "OIL_PRICE")
      .eq("report_source", "oilprice.com")
      .eq("report_date", today)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Oil prices already fetched today",
          skipped: true,
        }),
        {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the page
    const response = await fetch(
      "https://oilprice.com/oil-price-charts/#prices",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AQMaritime/1.0)",
          Accept: "text/html",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch oilprice.com: ${response.status}`);
    }

    const html = await response.text();

    // Try HTML regex parsing first
    let prices = parseOilPricesHtml(html);

    // Fallback to Claude if we got fewer than 3 key benchmarks
    const hasWti = prices.some(
      (p) => p.name === "WTI Crude" && p.price != null
    );
    const hasBrent = prices.some(
      (p) => p.name === "Brent Crude" && p.price != null
    );

    if (!hasWti || !hasBrent || prices.length < 3) {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (ANTHROPIC_API_KEY) {
        // Strip HTML to text
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s{2,}/g, " ")
          .slice(0, 12000);

        const aiResponse = await fetch(
          "https://api.anthropic.com/v1/messages",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 800,
              temperature: 0,
              messages: [
                {
                  role: "user",
                  content: `Extract oil and energy commodity prices from this oilprice.com page content.

For each commodity return: name, price (USD), change, change_pct.

Extract at minimum: WTI Crude, Brent Crude, Murban Crude, Natural Gas, Gasoline, Heating Oil, OPEC Basket, Dubai, DME Oman, Mars, LNG Japan/Korea Marker.

Return ONLY a valid JSON array:
[{"name":"WTI Crude","price":101.64,"change":2.00,"change_pct":2.01}]

Page content:
${textContent}`,
                },
              ],
            }),
          }
        );

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const aiText = aiResult.content?.[0]?.text ?? "";
          const cleaned = aiText
            .replace(/^```(?:json)?\n?/, "")
            .replace(/\n?```$/, "");
          try {
            prices = JSON.parse(cleaned) as OilPrice[];
          } catch {
            /* keep original prices */
          }
        }
      }
    }

    // Filter out entries with no price
    const validPrices = prices.filter((p) => p.price != null);

    if (validPrices.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not extract oil prices",
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Insert into market_data
    const rows = validPrices.map((p) => ({
      report_source: "oilprice.com",
      report_date: today,
      report_type: "DPP",
      record_type: "OIL_PRICE",
      source_broker: "oilprice.com",
      cargo_grade: p.name,
      rate_numeric: p.price,
      rate_value: p.change != null ? `${p.change > 0 ? "+" : ""}${p.change}` : null,
      rate_type: p.change_pct != null ? `${p.change_pct > 0 ? "+" : ""}${p.change_pct}%` : null,
      pdf_filename: "oilprice.com",
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
    console.error("fetch-oil-prices error:", err);
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
