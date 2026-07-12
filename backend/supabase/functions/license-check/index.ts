// SudoVoice — license-check (Supabase Edge Function, Deno).
//
// Authenticated endpoint the apps call on launch / daily revalidation.
//
//   POST /functions/v1/license-check
//   Authorization: Bearer <user JWT from Supabase auth>
//   Body (optional): { "device_id": "...", "platform": "windows|macos|android",
//                      "device_name": "...", "app_version": "..." }
//
//   200 -> { "plan": "free|pro", "status": "...", "current_period_end": ts|null,
//            "is_pro": bool }
//
// When device_id + platform are present the calling device row is upserted
// (public.devices, keyed on user_id + device_id) with a fresh last_seen.
//
// Deploy with JWT verification ON (the default): the gateway rejects
// unauthenticated calls before this code runs; we still resolve the user
// explicitly to scope every read/write.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const VALID_PLATFORMS = new Set(["windows", "macos", "android"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { error: "missing Authorization header" });
  }

  // User-scoped client: RLS applies to everything read through it.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return json(401, { error: "invalid or expired token" });
  }

  // Optional device registration.
  let body: {
    device_id?: string;
    platform?: string;
    device_name?: string;
    app_version?: string;
  } = {};
  const rawBody = (await req.text()).trim();
  if (rawBody.length > 0) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json(400, { error: "body must be JSON" });
    }
  }

  if (body.device_id) {
    if (!body.platform || !VALID_PLATFORMS.has(body.platform)) {
      return json(400, {
        error: 'platform must be one of "windows", "macos", "android" when device_id is sent',
      });
    }
    const { error: deviceError } = await admin.from("devices").upsert(
      {
        user_id: user.id,
        device_id: body.device_id,
        platform: body.platform,
        device_name: body.device_name ?? null,
        app_version: body.app_version ?? null,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" },
    );
    if (deviceError) {
      return json(500, { error: `device registration failed: ${deviceError.message}` });
    }
  }

  // License row is auto-created by the on_auth_user_created trigger; the
  // fallback below covers users that predate the schema.
  const { data: license, error: licenseError } = await userClient
    .from("licenses")
    .select("plan, status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  if (licenseError) {
    return json(500, { error: `license lookup failed: ${licenseError.message}` });
  }

  const plan = license?.plan ?? "free";
  const status = license?.status ?? "active";
  const currentPeriodEnd = license?.current_period_end ?? null;

  // Pro requires an active/trialing status and an unexpired period
  // (NULL period end = lifetime license).
  const periodOk = currentPeriodEnd === null || new Date(currentPeriodEnd).getTime() > Date.now();
  const isPro = plan === "pro" && (status === "active" || status === "trialing") && periodOk;

  return json(200, {
    plan,
    status,
    current_period_end: currentPeriodEnd,
    is_pro: isPro,
  });
});
