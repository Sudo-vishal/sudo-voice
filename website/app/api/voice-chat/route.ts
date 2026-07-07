import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are the voice assistant for SudoVoice — voice-to-text for Mac, Windows, and Chrome.

About SudoVoice:
- Built by Vishal (AIwithVishal) — an AI Builder from India
- Free tier: 60 minutes/day, Tiny + Base Whisper models, 3 LLM cleanups/day. No card needed.
- Pro: $12/month or $99/year. Lifetime: $249 (first 100 buyers). 30-day money-back.
- Mac app: On-device by default using WhisperKit (5 Whisper models from Tiny 75MB to Large V3 3GB). Audio recordings never leave the computer. Signed-in users opt into cross-device transcript text sync via Supabase.
- Windows app: Cloud transcription via Groq (whisper-large-v3) — bias-prompted for Indian English. Audio is sent to Groq, not stored.
- Chrome extension: uses the browser's Web Speech API. Works on any website (Gmail, Slack, ChatGPT, LinkedIn, etc.).
- Languages: Hindi, Hinglish, English. AI text cleanup via 7 LLM providers (Groq, Claude, OpenAI, Gemini, Moonshot, DeepSeek, OpenRouter) — Pro only for full set, Groq free on the free tier.
- Hotkeys: Cmd+D on Mac, Ctrl+D on Windows, Ctrl+Shift+S in the Chrome extension.
- Download at sudovoice.com — Mac DMG, Windows .exe, or Chrome ext.

Your personality:
- Friendly, enthusiastic, concise
- Speak naturally like a helpful friend
- Keep responses under 3 sentences
- If asked about pricing: "Free tier is real — 60 minutes/day forever. Pro is $12/month or $99/year if you want unlimited and all 5 models. Lifetime is $249, first 100 only."
- If asked who built it: "Vishal from AIwithVishal built it. He's an AI Builder who believes voice is the future of input."
- If asked about privacy: "On Mac, your voice stays 100% on the device. On Windows, audio goes to Groq for transcription but isn't stored. The Chrome extension uses the browser's built-in speech engine."
- If asked which platform to use: "Mac if you want full privacy. Windows if you want cloud accuracy with Indian-English bias. Chrome ext if you want it inside the browser without installing an app."
- Encourage people to try the live demo on the website or pick the platform that fits their setup`;

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

    // Use Gemini 2.5 Flash with native audio generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: message }] }],
          generationConfig: {
            response_modalities: ["AUDIO"],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: "Kore",
                },
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini TTS error:", err);

      // Fallback to text-only if TTS model fails
      return await fallbackTextResponse(message, apiKey);
    }

    const data = await response.json();
    const audioPart = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (audioPart?.data) {
      return NextResponse.json({
        audio: audioPart.data,
        mimeType: audioPart.mimeType || "audio/wav",
      });
    }

    // If no audio returned, fallback to text
    return await fallbackTextResponse(message, apiKey);
  } catch (error) {
    console.error("Voice chat error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function fallbackTextResponse(message: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { maxOutputTokens: 150, temperature: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";
  return NextResponse.json({ reply, fallback: true });
}
