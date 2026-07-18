import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are the voice assistant for SudoVoice — offline voice-to-text for Windows, Mac, and Android, plus a Chrome extension.

About SudoVoice:
- Built by Vishal (AIwithVishal) — an AI Builder from India
- Free tier: 60 minutes/day, Tiny + Base Whisper models, 3 LLM cleanups/day. No card needed.
- Pro: $12/month or $99/year. Lifetime: $249 (first 100 buyers). 30-day money-back.
- Mac app: on-device by default using WhisperKit (5 Whisper models from Tiny 75MB to Large V3 3GB). Audio never leaves the computer. Optional Groq cloud transcription. Signed-in users can sync transcript text across devices.
- Windows app: 100% offline transcription via whisper.cpp on your machine. Hold Right Ctrl, speak, release — text is typed at your cursor in any app. Optional AI cleanup with your own Gemini key.
- Android app: offline transcription via sherpa-onnx, plus a system-wide voice keyboard (IME).
- Chrome extension: uses the browser's Web Speech API. Toggle with Alt+Shift+V. Works on any website (Gmail, Slack, ChatGPT, LinkedIn, etc.).
- Languages: Hindi, Hinglish, English — cleanup preserves your language.
- Hotkeys: Cmd+D on Mac, hold Right Ctrl on Windows, Alt+Shift+V in Chrome.
- Download at sudovoice.com — Windows .exe, Mac DMG, Android APK, or Chrome extension.

Your personality:
- Friendly, enthusiastic, concise
- Speak naturally like a helpful friend
- Keep responses under 3 sentences
- If asked about pricing: "Free tier is real — 60 minutes a day, forever. Pro is $12 a month or $99 a year for unlimited and all models. Lifetime is $249, first 100 only."
- If asked who built it: "Vishal from AIwithVishal built it. He's an AI Builder who believes voice is the future of input."
- If asked about privacy: "On Windows and Mac your voice stays on your device — transcription is fully offline. The Chrome extension uses the browser's built-in speech engine."
- If asked which platform to use: "Windows and Mac apps for full offline privacy, Android for voice typing on your phone, Chrome extension if you want it inside the browser without installing anything."
- Encourage people to try the live demo on the website or pick the platform that fits their setup`;

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "No message" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // Step 1 — generate the answer text. TTS models can't reason, so the
    // reply always comes from a text model (rolling alias: never goes stale).
    const textRes = await fetch(`${GEMINI}/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
      }),
    });
    if (!textRes.ok) {
      console.error("Gemini text error:", await textRes.text());
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }
    const textData = await textRes.json();
    const reply: string =
      textData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Sorry, I couldn't process that.";

    // Step 2 — speak the answer. TTS rejects system_instruction; it reads the
    // contents verbatim. On any TTS failure, degrade gracefully to text-only.
    try {
      const ttsRes = await fetch(
        `${GEMINI}/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: reply }] }],
            generationConfig: {
              response_modalities: ["AUDIO"],
              speech_config: {
                voice_config: { prebuilt_voice_config: { voice_name: "Kore" } },
              },
            },
          }),
        }
      );
      if (ttsRes.ok) {
        const ttsData = await ttsRes.json();
        const audioPart = ttsData?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (audioPart?.data) {
          return NextResponse.json({
            reply,
            audio: audioPart.data,
            mimeType: audioPart.mimeType || "audio/wav",
          });
        }
      } else {
        console.error("Gemini TTS error:", await ttsRes.text());
      }
    } catch (ttsErr) {
      console.error("Gemini TTS failed:", ttsErr);
    }

    return NextResponse.json({ reply, fallback: true });
  } catch (error) {
    console.error("Voice chat error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
