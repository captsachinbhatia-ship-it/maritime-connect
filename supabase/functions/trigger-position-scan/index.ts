// supabase/functions/trigger-position-scan/index.ts
// Proxies CRM "Scan Now" button to the Gmail Apps Script Web App.
// Fire-and-forget: returns immediately, Apps Script runs in background.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const appsScriptUrl = Deno.env.get("APPS_SCRIPT_POSITION_SCAN_URL");

    if (!appsScriptUrl) {
      return new Response(
        JSON.stringify({
          error: "APPS_SCRIPT_POSITION_SCAN_URL secret not configured",
          help: "Add the Apps Script Web App URL as a Supabase Edge Function secret",
        }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Ensure ?type=positions is appended for routing in Apps Script
    const url = appsScriptUrl.includes("type=positions")
      ? appsScriptUrl
      : appsScriptUrl + (appsScriptUrl.includes("?") ? "&" : "?") + "type=positions";

    console.log("Triggering position scan via Apps Script:", url);

    // Fire-and-forget: kick off the request but don't await the full response.
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "positions", trigger: "crm_scan_now", timestamp: new Date().toISOString() }),
    }).catch((err) => console.error("Apps Script background error:", err));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Position scan triggered. Emails are being processed in background — new positions will appear shortly.",
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("trigger-position-scan error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
