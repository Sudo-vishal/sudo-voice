// Local dev harness — runs a Supabase Edge Function on a chosen port.
// Usage: PORT=54321 FUNC=razorpay-webhook deno run -A dev/serve.ts
// (Supabase's runtime injects the port in production; locally we monkeypatch
// Deno.serve so the function file runs unmodified.)
const port = Number(Deno.env.get("PORT") ?? "54321");
const fn = Deno.env.get("FUNC") ?? "razorpay-webhook";

const origServe = Deno.serve;
// @ts-ignore — accept both Deno.serve(handler) and Deno.serve(opts, handler)
Deno.serve = (optsOrHandler: unknown, maybeHandler?: unknown) => {
  if (typeof optsOrHandler === "function") {
    // @ts-ignore
    return origServe({ port }, optsOrHandler);
  }
  // @ts-ignore
  return origServe({ ...(optsOrHandler as object), port }, maybeHandler);
};

console.log(`[dev] serving ${fn} on http://localhost:${port}`);
await import(`../supabase/functions/${fn}/index.ts`);
