// supabase/functions/trigger-gmail-scan/index.ts
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
    const appsScriptUrl = Deno.env.get("APPS_SCRIPT_SCAN_URL");

    if (!appsScriptUrl) {
      return new Response(
        JSON.stringify({
          error: "APPS_SCRIPT_SCAN_URL secret not configured",
          help: "Add the Apps Script Web App URL as a Supabase Edge Function secret",
        }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    console.log("Triggering fixture scan via Apps Script:", appsScriptUrl);

    // Fire-and-forget: kick off the request but don't await the full response.
    // Apps Script scans can take 2-5 minutes — we return success immediately.
    fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "crm_scan_now", timestamp: new Date().toISOString() }),
    }).catch((err) => console.error("Apps Script background error:", err));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Fixture scan triggered. Emails are being processed in background — new fixtures will appear shortly.",
      }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("trigger-gmail-scan error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
