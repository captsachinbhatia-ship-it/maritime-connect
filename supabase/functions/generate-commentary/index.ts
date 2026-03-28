const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { section_name, fixtures_summary, report_type } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 60,
        temperature: 0.3,
        system: "You are a maritime market analyst. Write ONE concise sentence (max 20 words) summarising the current rate trend for the given section based on the fixture data provided. Be factual and specific to rates shown.",
        messages: [{
          role: "user",
          content: `Section: ${section_name}\nReport type: ${report_type}\nFixtures: ${fixtures_summary}`,
        }],
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ commentary: "" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const commentary = result.content?.[0]?.text?.trim() ?? "";

    return new Response(JSON.stringify({ commentary }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ commentary: "" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
