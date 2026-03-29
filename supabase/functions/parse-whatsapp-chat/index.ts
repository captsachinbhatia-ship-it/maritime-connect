const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a maritime chartering data extraction specialist. You parse WhatsApp chat exports from tanker chartering groups and extract structured data.

From the chat text, extract ALL of the following that appear:

1. CARGO ENQUIRIES / FIXTURES - for each one extract:
   - vessel_class (VLCC, Suezmax, Aframax, Panamax, MR, LR1, LR2, ULCC)
   - cargo_type (Crude, Fuel Oil, Naphtha, Gasoline, Jet, Gasoil, VGO, Lube, Chemical, LNG, LPG, CPP, DPP)
   - load_port or load_region (e.g. AG, WAF, Baltic, USG, Med, Black Sea)
   - discharge_port or discharge_region
   - laycan_raw (laydays/cancelling as raw text)
   - quantity_mt (numeric, in MT)
   - rate_ws (Worldscale points, numeric)
   - rate_lumpsum (numeric if lumpsum)
   - charterer (name if mentioned)
   - broker (name if mentioned)
   - status (Enquiry, On Subjects, Fixed, Failed)
   - last_cargo (if mentioned)
   - coating_required (boolean)
   - heating_required (boolean)
   - notes (any special requirements or extra info)

2. VESSEL POSITIONS - for each one extract:
   - vessel_name
   - vessel_class
   - open_port or open_region
   - open_date_raw (raw text)
   - last_cargo
   - owner or operator (if mentioned)
   - coated (boolean)
   - heated (boolean)
   - notes (special features: STS capable, etc.)

3. RATE INDICATIONS - for each one extract:
   - route (e.g. AG/Japan, WAF/UKC, Baltic/UKC)
   - vessel_class
   - rate_ws (Worldscale points, numeric)
   - rate_lumpsum (numeric)
   - tce_usd_day (if mentioned, numeric)
   - notes

4. CONTACTS - for each person extract:
   - name (from sender or message text)
   - phone (WhatsApp number if visible)
   - company (if mentioned)
   - role (Broker, Charterer, Owner, Operator, Trader)

5. TEAM INTERACTIONS - for each actionable message:
   - sender_name
   - action_type (Enquiry Received, Fixture Confirmed, Position Sent, Rate Given, Follow-up, Negotiation)
   - summary (1 line)
   - message_timestamp (if visible in chat, as ISO string or raw text)

Respond ONLY with a valid JSON object (no markdown, no explanation) in this exact structure:
{
  "cargo_enquiries": [],
  "vessel_positions": [],
  "rate_indications": [],
  "contacts": [],
  "team_interactions": [],
  "summary": "Brief 2-line summary of what was found in this chat"
}

Use null for fields you cannot determine. Return numeric values as numbers, not strings.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { chat_text } = await req.json();

    if (!chat_text || typeof chat_text !== "string" || !chat_text.trim()) {
      return new Response(
        JSON.stringify({ error: "chat_text is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Truncate to ~60k chars (~15k tokens) to stay within limits
    const truncated = chat_text.slice(0, 60000);
    const wasTruncated = chat_text.length > 60000;

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
        temperature: 0,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Parse this WhatsApp chat export:\n\n${truncated}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errText }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const raw = result.content?.map((b: { text?: string }) => b.text || "").join("") || "";
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse Claude response as JSON", raw_response: clean.slice(0, 500) }),
        { status: 422, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ...parsed, was_truncated: wasTruncated }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
