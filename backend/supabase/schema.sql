-- ============================================================================
-- SudoVoice cloud backend schema
-- ============================================================================
-- Idempotent: safe to re-run in the Supabase SQL editor at any time.
--
-- Client alignment notes (read before changing names):
--   * Table "transcripts" and every one of its columns mirror the macOS app:
--     Sources/Services/SupabaseService.swift
--       - insert struct TranscriptInsert (lines 125-137): source, kind, title,
--         raw_text, cleaned_text, language, model_used, llm_cleanup_model,
--         duration_seconds, word_count, char_count
--       - fetch select list (line 173): id, title, raw_text, cleaned_text,
--         language, duration_seconds, created_at
--       - line 109 comment: "RLS policy `auth.uid() = user_id` auto-enforces
--         ownership; we never set user_id manually." -> user_id therefore has
--         DEFAULT auth.uid() so client inserts work without sending it.
--   * profiles / licenses / devices are NOT yet queried by the Swift client
--     (LicenseService.swift still calls Lemon Squeezy). Names here follow the
--     backend spec; when the client migrates off Lemon Squeezy it should call
--     the license-check edge function, which reads these tables.
--   * Sources/Models/AppState.swift line 69: maxDevices = 3 — enforced in the
--     app, not the database, so a plan change never needs a migration.
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (pre-installed on Supabase).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles — one row per auth.users row, auto-created by trigger below
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- licenses — one row per user; plan/status driven by the Razorpay webhook
-- ----------------------------------------------------------------------------
create table if not exists public.licenses (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null unique references auth.users (id) on delete cascade,
  plan                     text not null default 'free'
                             check (plan in ('free', 'pro')),
  status                   text not null default 'active'
                             check (status in ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
  razorpay_payment_id      text,
  razorpay_subscription_id text,
  -- NULL current_period_end + plan 'pro' = lifetime (one-time payment.captured).
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists licenses_rzp_subscription_idx
  on public.licenses (razorpay_subscription_id)
  where razorpay_subscription_id is not null;

drop trigger if exists licenses_set_updated_at on public.licenses;
create trigger licenses_set_updated_at
  before update on public.licenses
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- devices — registered installs; upserted by the license-check edge function
-- ----------------------------------------------------------------------------
create table if not exists public.devices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  device_id   text not null,
  platform    text not null check (platform in ('windows', 'macos', 'android')),
  device_name text,
  app_version text,
  last_seen   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists devices_user_idx on public.devices (user_id);

-- ----------------------------------------------------------------------------
-- transcripts — exact shape SupabaseService.swift reads and writes
-- ----------------------------------------------------------------------------
create table if not exists public.transcripts (
  id                uuid primary key default gen_random_uuid(),
  -- DEFAULT auth.uid(): the Swift client never sends user_id
  -- (SupabaseService.swift line 109).
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source            text,          -- client sends "mac" (SupabaseService.swift line 140)
  kind              text,          -- client sends "dictation" (line 141)
  title             text,
  raw_text          text not null,
  cleaned_text      text,
  language          text,
  model_used        text,
  llm_cleanup_model text,
  duration_seconds  integer,
  word_count        integer,
  char_count        integer,
  created_at        timestamptz not null default now()
);

create index if not exists transcripts_user_created_idx
  on public.transcripts (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- webhook_events — idempotency ledger for the Razorpay webhook
-- ----------------------------------------------------------------------------
create table if not exists public.webhook_events (
  event_id    text primary key,   -- x-razorpay-event-id, or "<event>:<entity id>" fallback
  event_type  text,
  received_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Auto-provision: new auth user -> profile + free license
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do nothing;

  insert into public.licenses (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- The service role bypasses RLS, so edge functions (webhook, license-check)
-- can write everywhere. Authenticated users get exactly the policies below;
-- note there is deliberately NO insert/update/delete policy on licenses —
-- only the service role may write license rows.
alter table public.profiles       enable row level security;
alter table public.licenses       enable row level security;
alter table public.devices        enable row level security;
alter table public.transcripts    enable row level security;
alter table public.webhook_events enable row level security;  -- no policies: service role only

-- profiles: read + edit own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- licenses: read own row only (writes: service role exclusively)
drop policy if exists "licenses_select_own" on public.licenses;
create policy "licenses_select_own" on public.licenses
  for select to authenticated
  using (auth.uid() = user_id);

-- devices: users see and manage their own devices
drop policy if exists "devices_select_own" on public.devices;
create policy "devices_select_own" on public.devices
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "devices_insert_own" on public.devices;
create policy "devices_insert_own" on public.devices
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "devices_update_own" on public.devices;
create policy "devices_update_own" on public.devices
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "devices_delete_own" on public.devices;
create policy "devices_delete_own" on public.devices
  for delete to authenticated
  using (auth.uid() = user_id);

-- transcripts: the macOS client inserts, selects, and deletes
-- (SupabaseService.swift lines 154-157, 171-177, 189-193)
drop policy if exists "transcripts_select_own" on public.transcripts;
create policy "transcripts_select_own" on public.transcripts
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "transcripts_insert_own" on public.transcripts;
create policy "transcripts_insert_own" on public.transcripts
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "transcripts_delete_own" on public.transcripts;
create policy "transcripts_delete_own" on public.transcripts
  for delete to authenticated
  using (auth.uid() = user_id);
