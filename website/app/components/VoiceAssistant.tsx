"use client";

import { useState, useRef, useCallback } from "react";

export default function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback((base64Audio: string, mimeType: string) => {
    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const byteChars = atob(base64Audio);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onplay = () => {
      setIsSpeaking(true);
      setStatus("speaking");
    };
    audio.onended = () => {
      setIsSpeaking(false);
      setStatus("idle");
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setIsSpeaking(false);
      setStatus("idle");
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };

    audio.play().catch(() => {
      setStatus("idle");
    });
  }, []);

  // Fallback: browser TTS (only if Gemini audio fails)
  const speakFallback = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Samantha") || v.name.includes("Karen")
    );
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => { setIsSpeaking(true); setStatus("speaking"); };
    utterance.onend = () => { setIsSpeaking(false); setStatus("idle"); };
    speechSynthesis.speak(utterance);
  }, []);

  const askAI = useCallback(async (text: string) => {
    setStatus("thinking");
    try {
      const res = await fetch("/api/voice-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (data.audio) {
        // Gemini native AI voice
        playAudio(data.audio, data.mimeType || "audio/wav");
      } else if (data.reply) {
        // Fallback to browser TTS
        speakFallback(data.reply);
      } else {
        speakFallback("Sorry, I couldn't process that. Try again.");
      }
    } catch {
      speakFallback("Something went wrong. Please try again.");
    }
  }, [playAudio, speakFallback]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setStatus("idle");
  }, []);

  const toggleListening = useCallback(() => {
    if (isSpeaking) {
      stopAudio();
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setStatus("idle");
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      speakFallback("Voice input requires Chrome or Edge browser.");
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      if (text) askAI(text);
    };

    recognition.onerror = () => { setIsListening(false); setStatus("idle"); };
    recognition.onend = () => { setIsListening(false); };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setStatus("listening");
  }, [isListening, isSpeaking, askAI, speakFallback, stopAudio]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    // Auto-greet with Gemini voice
    setTimeout(() => askAI("Say a brief, friendly greeting introducing yourself as the SudoVoice voice assistant."), 300);
  }, [askAI]);

  const handleClose = useCallback(() => {
    stopAudio();
    recognitionRef.current?.stop();
    setIsListening(false);
    setStatus("idle");
    setIsOpen(false);
  }, [stopAudio]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
          isOpen
            ? "bg-white/10 border border-white/20 hover:bg-white/15"
            : "bg-gradient-to-br from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 glow-blue"
        }`}
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        )}
      </button>

      {/* Voice panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-72 glass-card glow-card-purple rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold">SudoVoice AI</div>
              <div className="text-xs text-[#6B7A93]">Powered by Gemini voice</div>
            </div>
          </div>

          <div className="px-5 py-8 flex flex-col items-center gap-4">
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                  status === "listening"
                    ? "bg-cyan-500/15 border-2 border-cyan-500/50"
                    : status === "thinking"
                    ? "bg-cyan-500/15 border-2 border-cyan-500/50"
                    : status === "speaking"
                    ? "bg-green-500/15 border-2 border-green-500/50"
                    : "bg-white/5 border-2 border-white/10"
                }`}
              >
                {status === "listening" && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-1 bg-cyan-400 rounded-full wave-bar" style={{ height: 6 }} />
                    ))}
                  </div>
                )}
                {status === "thinking" && (
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                )}
                {status === "speaking" && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-1 bg-green-400 rounded-full wave-bar" style={{ height: 6 }} />
                    ))}
                  </div>
                )}
                {status === "idle" && (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B7A93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                )}
              </div>

              {(status === "listening" || status === "speaking") && (
                <>
                  <span className={`absolute inset-0 rounded-full btn-pulse-ring ${status === "listening" ? "border-cyan-500/40" : "border-green-500/40"}`} />
                  <span className={`absolute inset-0 rounded-full btn-pulse-ring ${status === "listening" ? "border-cyan-500/40" : "border-green-500/40"}`} style={{ animationDelay: "0.8s" }} />
                </>
              )}
            </div>

            <div className="text-sm text-center">
              {status === "idle" && <span className="text-[#6B7A93]">Tap to speak</span>}
              {status === "listening" && <span className="text-cyan-400">Listening...</span>}
              {status === "thinking" && <span className="text-cyan-400">Thinking...</span>}
              {status === "speaking" && <span className="text-green-400">Speaking...</span>}
            </div>
          </div>

          <div className="px-5 pb-5 flex justify-center">
            <button
              onClick={toggleListening}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                status === "listening"
                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                  : status === "speaking"
                  ? "bg-white/5 text-[#6B7A93] border border-white/10"
                  : "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white"
              }`}
            >
              {status === "listening" ? (
                <><div className="w-3 h-3 rounded-sm bg-red-400" /> Stop</>
              ) : status === "speaking" ? (
                "Tap to interrupt"
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                  Ask me anything
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
