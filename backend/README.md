# SudoVoice Backend

Cloud account layer for SudoVoice (offline voice-to-text; macOS Swift + Windows
Electron + Android). Supabase handles auth, licensing, devices, and transcript
sync; Razorpay handles payments (India-first). Everything here is env-driven —
no credentials live in this repo.

```
backend/
├── .env.example                 # every env var, with source of each value
├── supabase/
│   ├── schema.sql               # idempotent DB schema + RLS (run in SQL editor)
│   ├── config.toml              # CLI config (webhook is public, license-check JWT-gated)
│   └── functions/
│       ├── razorpay-webhook/    # payment/subscription events -> licenses table
│       └── license-check/       # apps ask "am I Pro?" + register device
```

## Setup runbook

### 1. Create the Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project** → name `sudovoice`, region **Mumbai (ap-south-1)** for India-first latency.
2. Once provisioned, open **Project Settings → API** and note:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS)
3. Copy `backend/.env.example` to `backend/.env` and paste the three values. Add Razorpay values in step 5.
4. **Authentication → Sign In / Up → Email**: enable Email provider. The macOS app signs in with 6-digit email OTP (`signInWithOTP`), which works out of the box; optionally raise OTP expiry under **Auth → Email**.

### 2. Run the schema

1. Dashboard → **SQL Editor** → **New query**.
2. Paste the full contents of `backend/supabase/schema.sql` → **Run**.
3. Safe to re-run any time (all statements are idempotent). It creates `profiles`, `licenses`, `devices`, `transcripts`, `webhook_events`, the auto-provisioning trigger on `auth.users` (new user → profile + free license), and all RLS policies.

### 3. Deploy the edge functions

Prereq: [Supabase CLI](https://supabase.com/docs/guides/cli) ≥ v1.200 and a personal access token (`supabase login`).

```sh
cd backend
supabase link --project-ref YOUR-PROJECT-REF          # ref = subdomain of your project URL
supabase functions deploy razorpay-webhook --no-verify-jwt
supabase functions deploy license-check
```

`--no-verify-jwt` is required on the webhook (Razorpay can't send a Supabase JWT; the HMAC signature is the auth gate). `config.toml` already pins the same via `verify_jwt = false`, so plain `supabase functions deploy` from `backend/` also does the right thing.

### 4. Set function secrets

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected into edge functions automatically — do **not** set them. Only the Razorpay secret is needed:

```sh
supabase secrets set RAZORPAY_WEBHOOK_SECRET=your-chosen-webhook-secret
```

(Keep `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `backend/.env` for whatever server or script creates orders/subscriptions; the two deployed functions don't need them.)

### 5. Razorpay dashboard

1. [dashboard.razorpay.com](https://dashboard.razorpay.com) → **Account & Settings → API Keys → Generate Key** → paste key id/secret into `backend/.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
2. **Account & Settings → Webhooks → Add New Webhook**:
   - **Webhook URL**: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/razorpay-webhook`
   - **Secret**: the exact string you set as `RAZORPAY_WEBHOOK_SECRET` in step 4
   - **Active Events**: `payment.captured`, `subscription.activated`, `subscription.cancelled`
3. **Important**: when your checkout flow creates a Razorpay order or subscription, put the buyer's Supabase auth UUID in `notes.user_id` (fallback: `notes.email` matching their sign-in email). That's how the webhook maps a payment to a license row — payments without either are acknowledged but logged as unmatched.

### 6. Paste keys into the apps

Only `SUPABASE_URL` + `SUPABASE_ANON_KEY` ever go into apps (anon key is safe to ship; RLS protects data). The service role key never leaves the server.

- **macOS** — `Sources/App/Info.plist` has a commented `SupabaseURL` / `SupabaseAnonKey` block (lines 13–21): uncomment and fill it. Dev builds can instead export `SUPABASE_URL` / `SUPABASE_ANON_KEY` env vars — `SupabaseService.swift` checks both.
- **Windows (Electron)** — provide `SUPABASE_URL` / `SUPABASE_ANON_KEY` via the app's `.env` / settings store using the same variable names, so `backend/.env.example` stays the single naming reference.
- **Android** — `android/gradle.properties` (or untracked `local.properties`): add `SUPABASE_URL=...` and `SUPABASE_ANON_KEY=...`, then expose them in `android/app/build.gradle.kts` as `buildConfigField("String", "SUPABASE_URL", "\"${property("SUPABASE_URL")}\"")` etc.

### 7. Test the webhook (curl + computed signature)

The function verifies `x-razorpay-signature` = HMAC-SHA256(raw body, `RAZORPAY_WEBHOOK_SECRET`) as hex. Compute a valid test signature with openssl:

```sh
SECRET='your-chosen-webhook-secret'   # must equal the deployed RAZORPAY_WEBHOOK_SECRET
BODY='{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_TEST000000001","notes":{"user_id":"00000000-0000-0000-0000-000000000000"}}}}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')

curl -i -X POST "https://YOUR-PROJECT-REF.supabase.co/functions/v1/razorpay-webhook" \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIG" \
  -H "x-razorpay-event-id: evt_test_$(date +%s)" \
  --data "$BODY"
```

Expected results:

- Correct signature + real auth user UUID in `notes.user_id` → `200 {"ok":true,"applied":"payment.captured",...}` and that user's `licenses` row flips to `plan=pro, status=active`.
- Repeat the **same** `x-razorpay-event-id` → `200 {"ok":true,"skipped":"event already processed"}` (idempotency).
- Tamper one byte of `$BODY` after computing `$SIG` → `401 {"error":"invalid signature"}`.

### 8. Test license-check

```sh
ACCESS_TOKEN='a signed-in user JWT'   # e.g. session.access_token from any app
curl -s -X POST "https://YOUR-PROJECT-REF.supabase.co/functions/v1/license-check" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"device_id":"my-test-device","platform":"macos","device_name":"Test Mac","app_version":"2.6.0"}'
# -> {"plan":"pro","status":"active","current_period_end":null,"is_pro":true}
```

The call also upserts the caller's row in `devices` (keyed on `user_id + device_id`) and refreshes `last_seen`.

## Schema ↔ client contract

- `transcripts` matches `Sources/Services/SupabaseService.swift` exactly (insert struct lines 125–137, select list line 173). `user_id` has `DEFAULT auth.uid()` because the client never sends it (line 109).
- `licenses` semantics: `plan=pro` + `status active/trialing` + (`current_period_end` NULL **or** in the future) = Pro. NULL `current_period_end` means lifetime (one-time `payment.captured`).
- Device limits (3 per license, `AppState.swift` line 69) are enforced app-side; the `devices` table just records installs.
- Heads-up: `Sources/Services/LicenseService.swift` still validates against **Lemon Squeezy**. Once Razorpay goes live, point it at `POST /functions/v1/license-check` with the Supabase session JWT instead.
