// Browser-side Supabase client — plain REST, no SDK dependency.
// The anon key is public-by-design (RLS scopes every query to the caller);
// same key ships inside the desktop apps.
const URL_ =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iyuqavqjhmqnvvibbcmu.supabase.co";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dXFhdnFqaG1xbnZ2aWJiY211Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODk0MzAsImV4cCI6MjA5OTk2NTQzMH0.L56E3lb9c5cqKHQXI27FzsSNHTE_Ge2b5IvNCqCwg1o";

const STORE = "sudovoice.session";

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  user: { id: string; email: string };
};

function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORE) || "null");
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(STORE, JSON.stringify(s));
  else localStorage.removeItem(STORE);
}

function toSession(data: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email: string };
}): Session {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    user: { id: data.user.id, email: data.user.email },
  };
}

async function auth(path: string, body: unknown) {
  const res = await fetch(`${URL_}/auth/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.msg || data.error_description || data.message || `HTTP ${res.status}`);
  }
  return data;
}

/** Email a 6-digit sign-in code (creates the account on first use). */
export async function sendCode(email: string): Promise<void> {
  await auth("otp", { email, create_user: true });
}

/** Redeem the 6-digit code for a session. */
export async function verifyCode(email: string, token: string): Promise<Session> {
  const data = await auth("verify", { email, token, type: "email" });
  const s = toSession(data);
  saveSession(s);
  return s;
}

/** Current session, transparently refreshed when within 60s of expiry. */
export async function getSession(): Promise<Session | null> {
  const s = loadSession();
  if (!s) return null;
  if (s.expires_at - 60 > Date.now() / 1000) return s;
  try {
    const data = await auth("token?grant_type=refresh_token", {
      refresh_token: s.refresh_token,
    });
    const next = toSession({ ...data, user: data.user || s.user });
    saveSession(next);
    return next;
  } catch {
    saveSession(null);
    return null;
  }
}

export function signOut(): void {
  const s = loadSession();
  saveSession(null);
  if (s) {
    // Best-effort server-side revoke; local clear is what matters.
    fetch(`${URL_}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: ANON, Authorization: `Bearer ${s.access_token}` },
    }).catch(() => {});
  }
}

async function rest<T>(path: string, s: Session): Promise<T> {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${s.access_token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export type License = {
  plan: string;
  status: string;
  current_period_end: string | null;
};

export function licenseIsPro(l: License | null): boolean {
  if (!l) return false;
  return (
    l.plan === "pro" &&
    (l.status === "active" || l.status === "trialing") &&
    (!l.current_period_end || new Date(l.current_period_end) > new Date())
  );
}

/** RLS returns only the caller's row. */
export async function getLicense(s: Session): Promise<License | null> {
  const rows = await rest<License[]>(
    "licenses?select=plan,status,current_period_end&limit=1",
    s
  );
  return rows[0] || null;
}

export type Transcript = {
  id: string;
  title: string | null;
  raw_text: string;
  cleaned_text: string | null;
  created_at: string;
};

export async function getTranscripts(s: Session, limit = 20): Promise<Transcript[]> {
  return rest<Transcript[]>(
    `transcripts?select=id,title,raw_text,cleaned_text,created_at&order=created_at.desc&limit=${limit}`,
    s
  );
}
