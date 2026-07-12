// SudoVoice — Razorpay webhook handler (Supabase Edge Function, Deno).
//
// Verifies X-Razorpay-Signature (HMAC-SHA256 of the raw body with
// RAZORPAY_WEBHOOK_SECRET), then syncs public.licenses:
//
//   payment.captured        -> plan pro, status active (lifetime: period_end null)
//   subscription.activated  -> plan pro, status active, period_end = current_end
//   subscription.cancelled  -> status cancelled
//
// Idempotent: each delivery is claimed in public.webhook_events keyed on the
// x-razorpay-event-id header (fallback: "<event>:<entity id>"). Duplicate
// deliveries return 200 without touching licenses.
//
// User resolution: Razorpay `notes` must carry the buyer identity. Set
// notes.user_id (Supabase auth user UUID) when creating the order or
// subscription; notes.email is accepted as a fallback and matched against
// public.profiles.email.
//
// Deploy with --no-verify-jwt (Razorpay cannot send a Supabase JWT).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const encoder = new TextEncoder();

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Constant-time HMAC-SHA256 verification via WebCrypto. */
async function verifySignature(rawBody: string, signatureHex: string): Promise<boolean> {
  const signature = hexToBytes(signatureHex.trim());
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(rawBody));
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Notes = Record<string, string> | null | undefined;

/** notes.user_id (auth UUID) preferred; notes.email matched via profiles. */
async function resolveUserId(notes: Notes): Promise<string | null> {
  if (notes?.user_id) return notes.user_id;
  if (notes?.email) {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("email", notes.email.toLowerCase())
      .maybeSingle();
    if (error) throw new Error(`profile lookup failed: ${error.message}`);
    return data?.id ?? null;
  }
  return null;
}

async function upsertLicense(row: {
  user_id: string;
  plan: string;
  status: string;
  razorpay_payment_id?: string | null;
  razorpay_subscription_id?: string | null;
  current_period_end?: string | null;
}): Promise<void> {
  const { error } = await admin
    .from("licenses")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(`license upsert failed: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature || !(await verifySignature(rawBody, signature))) {
    return json(401, { error: "invalid signature" });
  }

  let payload: {
    event?: string;
    payload?: {
      payment?: { entity?: Record<string, unknown> };
      subscription?: { entity?: Record<string, unknown> };
    };
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "invalid JSON body" });
  }

  const event = payload.event ?? "";
  const payment = payload.payload?.payment?.entity as
    | { id?: string; notes?: Notes }
    | undefined;
  const subscription = payload.payload?.subscription?.entity as
    | { id?: string; notes?: Notes; current_end?: number }
    | undefined;

  const entityId = subscription?.id ?? payment?.id ?? crypto.randomUUID();
  const eventId = req.headers.get("x-razorpay-event-id") ?? `${event}:${entityId}`;

  // Claim the event id; a duplicate delivery inserts nothing and exits early.
  const { data: claim, error: claimError } = await admin
    .from("webhook_events")
    .upsert(
      { event_id: eventId, event_type: event },
      { onConflict: "event_id", ignoreDuplicates: true },
    )
    .select("event_id");
  if (claimError) {
    return json(500, { error: `idempotency claim failed: ${claimError.message}` });
  }
  if (!claim || claim.length === 0) {
    return json(200, { ok: true, skipped: "event already processed" });
  }

  try {
    switch (event) {
      case "payment.captured": {
        const userId = await resolveUserId(payment?.notes);
        if (!userId) {
          // Retrying will not conjure a user id; acknowledge and surface in logs.
          console.error(`payment.captured ${payment?.id}: no notes.user_id/notes.email match`);
          return json(200, { ok: false, reason: "no matching user for payment notes" });
        }
        await upsertLicense({
          user_id: userId,
          plan: "pro",
          status: "active",
          razorpay_payment_id: payment?.id ?? null,
          current_period_end: null, // one-time purchase = lifetime
        });
        return json(200, { ok: true, applied: event, user_id: userId });
      }

      case "subscription.activated": {
        const userId = await resolveUserId(subscription?.notes);
        if (!userId) {
          console.error(`subscription.activated ${subscription?.id}: no notes.user_id/notes.email match`);
          return json(200, { ok: false, reason: "no matching user for subscription notes" });
        }
        await upsertLicense({
          user_id: userId,
          plan: "pro",
          status: "active",
          razorpay_subscription_id: subscription?.id ?? null,
          current_period_end: subscription?.current_end
            ? new Date(subscription.current_end * 1000).toISOString()
            : null,
        });
        return json(200, { ok: true, applied: event, user_id: userId });
      }

      case "subscription.cancelled": {
        // Match by subscription id first (authoritative), notes as fallback.
        let matched = false;
        if (subscription?.id) {
          const { data, error } = await admin
            .from("licenses")
            .update({ status: "cancelled" })
            .eq("razorpay_subscription_id", subscription.id)
            .select("user_id");
          if (error) throw new Error(`license cancel failed: ${error.message}`);
          matched = (data?.length ?? 0) > 0;
        }
        if (!matched) {
          const userId = await resolveUserId(subscription?.notes);
          if (userId) {
            const { error } = await admin
              .from("licenses")
              .update({ status: "cancelled" })
              .eq("user_id", userId);
            if (error) throw new Error(`license cancel failed: ${error.message}`);
            matched = true;
          }
        }
        if (!matched) {
          console.error(`subscription.cancelled ${subscription?.id}: no matching license row`);
          return json(200, { ok: false, reason: "no matching license for subscription" });
        }
        return json(200, { ok: true, applied: event });
      }

      default:
        // Unsubscribed event type slipped through dashboard config; acknowledge.
        return json(200, { ok: true, skipped: `unhandled event "${event}"` });
    }
  } catch (err) {
    // Release the idempotency claim so Razorpay's retry can succeed.
    await admin.from("webhook_events").delete().eq("event_id", eventId);
    console.error(`webhook processing failed for ${eventId}:`, err);
    return json(500, { error: err instanceof Error ? err.message : "processing failed" });
  }
});
