"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  sendCode, verifyCode, getSession, signOut as doSignOut,
  getLicense, getTranscripts, licenseIsPro,
  type Session, type License, type Transcript,
} from "@/app/lib/supabase-browser";

function AccountInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [phase, setPhase] = useState<"loading" | "email" | "code" | "in">("loading");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [license, setLicense] = useState<License | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);

  const afterSignIn = useCallback(
    (s: Session) => {
      setSession(s);
      setPhase("in");
      // Came here from a paid pricing CTA? Resume that checkout.
      const next = params.get("next");
      const plan = params.get("plan");
      if (next === "checkout" && plan) {
        router.push(`/pricing?checkout=${encodeURIComponent(plan)}`);
      }
    },
    [params, router]
  );

  useEffect(() => {
    getSession().then((s) => {
      if (s) afterSignIn(s);
      else setPhase("email");
    });
  }, [afterSignIn]);

  useEffect(() => {
    if (!session) return;
    getLicense(session).then(setLicense).catch(() => {});
    getTranscripts(session).then(setTranscripts).catch(() => {});
  }, [session]);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await sendCode(email.trim());
      setPhase("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "couldn't send the code");
    }
    setBusy(false);
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const s = await verifyCode(email.trim(), code.trim());
      afterSignIn(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "invalid code");
    }
    setBusy(false);
  };

  const isPro = licenseIsPro(license);

  if (phase === "loading") {
    return <div className="max-w-md mx-auto text-center font-mono text-sm text-[#5C6E8A]">loading…</div>;
  }

  if (phase !== "in") {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="kicker mb-3">$ sudovoice --login</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your account</h1>
          <p className="mt-3 text-[#8FA3BF]">
            One account for every device — dictation history and Pro, synced.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {phase === "email" ? (
            <form onSubmit={submitEmail} className="space-y-4">
              <label className="block">
                <span className="font-mono text-xs text-[#5C6E8A]">email</span>
                <input
                  type="email" required autoFocus value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 w-full rounded-lg border border-[#1C2940] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-[#5C6E8A] focus:outline-none focus:border-[#00E676]/50"
                />
              </label>
              <button type="submit" disabled={busy} className="btn-primary w-full px-5 py-3 text-sm disabled:opacity-60">
                {busy ? "sending…" : "Send sign-in code"}
              </button>
              <p className="font-mono text-[11px] text-[#5C6E8A] text-center">
                no password — we email you a 6-digit code. new emails create an account.
              </p>
            </form>
          ) : (
            <form onSubmit={submitCode} className="space-y-4">
              <p className="text-sm text-[#8FA3BF]">
                Code sent to <span className="text-[#00E676] font-mono">{email}</span>
              </p>
              <label className="block">
                <span className="font-mono text-xs text-[#5C6E8A]">6-digit code</span>
                <input
                  inputMode="numeric" pattern="[0-9]*" maxLength={6} required autoFocus value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  className="mt-1.5 w-full rounded-lg border border-[#1C2940] bg-white/[0.03] px-4 py-3 text-lg tracking-[0.4em] font-mono text-white placeholder-[#5C6E8A] focus:outline-none focus:border-[#00E676]/50"
                />
              </label>
              <button type="submit" disabled={busy} className="btn-primary w-full px-5 py-3 text-sm disabled:opacity-60">
                {busy ? "verifying…" : "Verify & sign in"}
              </button>
              <button type="button" onClick={() => { setPhase("email"); setError(""); }}
                className="w-full font-mono text-xs text-[#5C6E8A] hover:text-white transition-colors">
                ← different email
              </button>
            </form>
          )}
          {error && <p className="mt-4 font-mono text-xs text-red-400">error: {error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <div className="kicker mb-3">$ whoami</div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight break-all">{session?.user.email}</h1>
        <div className="mt-4 inline-flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full font-mono text-[12px] font-semibold ${
            isPro
              ? "bg-[#00E676] text-black shadow-[0_0_20px_rgba(0,230,118,0.4)]"
              : "border border-[#1C2940] bg-white/[0.03] text-[#8FA3BF]"
          }`}>
            {isPro ? "PRO" : "FREE"}
          </span>
          {isPro && license?.current_period_end && (
            <span className="font-mono text-[11px] text-[#5C6E8A]">
              renews {new Date(license.current_period_end).toLocaleDateString()}
            </span>
          )}
          {isPro && !license?.current_period_end && (
            <span className="font-mono text-[11px] text-[#5C6E8A]">lifetime</span>
          )}
        </div>
      </div>

      {!isPro && (
        <div className="glass-card rounded-2xl p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-semibold">Unlock Pro</div>
            <div className="text-sm text-[#8FA3BF]">Unlimited transcription, all models, every device.</div>
          </div>
          <a href="/pricing" className="btn-primary px-5 py-2.5 text-sm shrink-0">See pricing</a>
        </div>
      )}

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-[13px] text-[#00E676]">$ history --recent</h2>
          <span className="font-mono text-[11px] text-[#5C6E8A]">{transcripts.length} synced</span>
        </div>
        {transcripts.length === 0 ? (
          <p className="text-sm text-[#8FA3BF]">
            No synced dictations yet. Sign in inside the Windows or Mac app and your
            dictation history appears here.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {transcripts.map((t) => (
              <li key={t.id} className="py-3">
                <div className="text-sm text-[#C6D3E8] line-clamp-2">
                  {t.cleaned_text || t.raw_text}
                </div>
                <div className="mt-1 font-mono text-[11px] text-[#5C6E8A]">
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => { doSignOut(); setSession(null); setPhase("email"); setLicense(null); setTranscripts([]); }}
          className="font-mono text-xs text-[#5C6E8A] hover:text-red-400 transition-colors"
        >
          $ logout
        </button>
      </div>
    </div>
  );
}

export default function AccountClient() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto text-center font-mono text-sm text-[#5C6E8A]">loading…</div>}>
      <AccountInner />
    </Suspense>
  );
}
