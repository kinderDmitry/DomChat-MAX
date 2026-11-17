import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateMaxInitData } from "./max-init-data.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const botToken = Deno.env.get("MAX_BOT_TOKEN");
  if (!botToken) return json({ error: "max_auth_not_configured" }, 503);

  let payload: { initData?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (typeof payload.initData !== "string" || payload.initData.length > 16_384) {
    return json({ error: "invalid_init_data" }, 400);
  }

  const result = await validateMaxInitData(payload.initData, botToken, { maxAgeSeconds: 86_400 });
  if (!result.ok) return json({ error: "invalid_max_launch_data" }, 401);

  return json({
    ok: true,
    user: {
      id: result.user.id,
      first_name: result.user.first_name,
      last_name: result.user.last_name ?? null,
      username: result.user.username ?? null,
      language_code: result.user.language_code ?? null,
    },
    auth_date: result.authDate,
    chat: result.chat ?? null,
  });
});
