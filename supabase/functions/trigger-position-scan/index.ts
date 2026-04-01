// supabase/functions/trigger-position-scan/index.ts
// Proxies CRM "Scan Now" button to the Gmail Apps Script Web App
// that scans position list emails.

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

    console.log("Triggering position scan via Apps Script:", appsScriptUrl);

    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "crm_scan_now", timestamp: new Date().toISOString() }),
    });

    // Apps Script may redirect (302) for Web Apps — follow redirects
    const responseText = await response.text();

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw_response: responseText.slice(0, 500), status: response.status };
    }

    return new Response(
      JSON.stringify({
        success: response.ok || response.status === 302,
        apps_script_status: response.status,
        result,
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
