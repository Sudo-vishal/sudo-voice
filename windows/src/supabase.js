// SudoVoice cloud backend (sign-in, Pro licensing, transcript sync).
// Plain fetch against Supabase — no SDK. The anon key is public-by-design
// (RLS enforces access); dev builds can override via SUPABASE_URL /
// SUPABASE_ANON_KEY environment variables.
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://iyuqavqjhmqnvvibbcmu.supabase.co";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dXFhdnFqaG1xbnZ2aWJiY211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODk0MzAsImV4cCI6MjA5OTk2NTQzMH0.L56E3lb9c5cqKHQXI27FzsSNHTE_Ge2b5IvNCqCwg1o";

const REVALIDATE_SECONDS = 24 * 60 * 60;      // re-check license daily
const OFFLINE_GRACE_SECONDS = 7 * 24 * 60 * 60; // honor cached Pro for 7 days offline

// ------------------------------------------------------------------ store
// Session + license cache live in userData/auth.json (separate from
// settings.json so exporting/resetting settings never leaks tokens).
let FILE = null;
function file() {
  if (!FILE) {
    FILE = path.join(require("electron").app.getPath("userData"), "auth.json");
  }
  return FILE;
}

let store = null;
function load() {
  if (store) return store;
  try {
    store = JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
    store = {};
  }
  if (!store.deviceId) {
    store.deviceId = crypto.randomUUID();
    save();
  }
  return store;
}
function save() {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(store, null, 2));
}

// ------------------------------------------------------------------ http
async function api(pathname, { method = "GET", token, body, headers } = {}) {
  const res = await fetch(SUPABASE_URL + pathname, {
    method,
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  if (!res.ok) {
    const msg = data?.msg || data?.message || data?.error_description || data?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function setSession(data) {
  load().session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: { id: data.user?.id, email: data.user?.email },
  };
  save();
}

// ------------------------------------------------------------------ auth
async function sendCode(email) {
  await api("/auth/v1/otp", {
    method: "POST",
    body: { email, create_user: true }, // OTP doubles as sign-up + sign-in
  });
  return { sent: true };
}

async function verifyCode(email, code) {
  const data = await api("/auth/v1/verify", {
    method: "POST",
    body: { type: "email", email, token: code },
  });
  if (!data?.access_token) throw new Error("no session returned");
  setSession(data);
  return getState();
}

let refreshing = null; // dedup concurrent refreshes
async function refreshSession() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const s = load().session;
    if (!s?.refresh_token) return null;
    try {
      const data = await api("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: s.refresh_token },
      });
      setSession(data);
      return load().session.access_token;
    } catch (err) {
      if (err.status >= 400 && err.status < 500) {
        // refresh token revoked/expired — force re-sign-in
        delete load().session;
        save();
      }
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function getAccessToken() {
  const s = load().session;
  if (!s) return null;
  if (s.expires_at - 60 > Math.floor(Date.now() / 1000)) return s.access_token;
  return refreshSession();
}

async function signOut() {
  const token = load().session?.access_token;
  if (token) {
    try { await api("/auth/v1/logout", { method: "POST", token }); } catch { /* best effort */ }
  }
  delete load().session;
  delete load().license;
  save();
  return getState();
}

function getState() {
  const { session, license } = load();
  return {
    signedIn: !!session,
    email: session?.user?.email || null,
    license: license
      ? { plan: license.plan, status: license.status, isPro: licenseIsPro(license) }
      : null,
  };
}

// ------------------------------------------------------------------ license
function licenseIsPro(license) {
  if (!license?.is_pro) return false;
  // Offline grace: a cached Pro result stays valid for 7 days without a re-check.
  const age = Math.floor(Date.now() / 1000) - (license.checked_at || 0);
  return age <= OFFLINE_GRACE_SECONDS;
}

async function checkLicense({ appVersion, force = false } = {}) {
  const cached = load().license;
  const age = Math.floor(Date.now() / 1000) - (cached?.checked_at || 0);
  if (cached && !force && age < REVALIDATE_SECONDS) return getState().license;

  const token = await getAccessToken();
  if (!token) return null;
  try {
    const data = await api("/functions/v1/license-check", {
      method: "POST",
      token,
      body: {
        device_id: load().deviceId,
        platform: "windows",
        device_name: os.hostname(),
        app_version: appVersion,
      },
    });
    load().license = { ...data, checked_at: Math.floor(Date.now() / 1000) };
    save();
  } catch (err) {
    console.error("license check failed:", err.message); // keep cache — offline grace
  }
  return getState().license;
}

// ------------------------------------------------------------------ transcripts
// One insert per completed dictation, same shape as the Mac client.
// user_id is filled by the DB (DEFAULT auth.uid()); RLS scopes the row.
async function saveDictation({
  rawText, cleanedText, language, model, cleanupModel, durationSeconds,
}) {
  const token = await getAccessToken();
  if (!token) return; // not signed in — dictation stays local-only
  const finalText = cleanedText || rawText;
  const title = finalText.trim().slice(0, 60) || null;
  await api("/rest/v1/transcripts", {
    method: "POST",
    token,
    headers: { Prefer: "return=minimal" },
    body: {
      source: "windows",
      kind: "dictation",
      title,
      raw_text: rawText,
      cleaned_text: cleanedText || null,
      language: language && language !== "auto" ? language : null,
      model_used: `whisper-${model}`,
      llm_cleanup_model: cleanupModel || null,
      duration_seconds: durationSeconds ? Math.round(durationSeconds) : null,
      word_count: finalText.split(/\s+/).filter(Boolean).length,
      char_count: finalText.length,
    },
  });
}

module.exports = {
  sendCode, verifyCode, signOut, getState, checkLicense, saveDictation,
};
