// Optional AI cleanup — bring-your-own Gemini API key. Removes filler words,
// fixes punctuation. On any failure, returns the raw transcript unchanged.
const PROMPT =
  "You clean up raw speech-to-text transcripts. Fix punctuation, casing and " +
  "obvious mis-hearings, remove filler words (um, uh, you know), keep the " +
  "speaker's language and meaning exactly. Output ONLY the cleaned text, " +
  "nothing else.";

async function clean(text, { apiKey, model = "gemini-2.5-flash", timeoutMs = 8000 }) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PROMPT }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );
    clearTimeout(timer);
    if (!res.ok) return text;
    const data = await res.json();
    const out = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return out || text;
  } catch {
    return text;
  }
}

module.exports = { clean };
