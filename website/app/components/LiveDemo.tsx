"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export default function LiveDemo() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [supported, setSupported] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t + " ";
        } else {
          interim = t;
        }
      }

      if (final) {
        setTranscript((prev) => {
          const updated = prev + final;
          setWordCount(updated.trim().split(/\s+/).filter(Boolean).length);
          return updated;
        });
      }
      setInterimText(interim);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  }, []);

  const clearText = () => {
    setTranscript("");
    setInterimText("");
    setWordCount(0);
  };

  const copyText = () => {
    navigator.clipboard.writeText(transcript.trim());
  };

  if (!supported) {
    return (
      <section id="try-it" className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Try It <span className="gradient-text">Live</span>
          </h2>
          <div className="glass-card rounded-2xl p-8">
            <p className="text-[#9FB0C7]">
              This browser doesn&apos;t support the live demo — but the apps don&apos;t need it.{" "}
              <a href="/#download" className="text-[#4FC3F7] hover:text-[#4FC3F7]/80">Download the Mac or Windows app</a>{" "}
              for full on-device transcription, or open this page in Chrome to try the demo.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="try-it" className="py-20 px-6 relative">
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/20 bg-green-500/5 text-green-400 text-sm font-medium mb-5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-subtle-pulse" />
            Live in your browser — no install needed
          </div>
          <h2 className="text-3xl md:text-5xl font-bold">
            Try It <span className="gradient-text">Right Now</span>
          </h2>
          <p className="mt-3 text-[#9FB0C7] text-lg max-w-lg mx-auto">
            Click the mic and start speaking. See how fast voice beats typing.
          </p>
        </div>

        <div className="glass-card glow-card-blue rounded-2xl overflow-hidden">
          {/* Editor header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-xs text-[#6B7A93] font-mono">voice-demo.txt</span>
            </div>
            <div className="flex items-center gap-3">
              {wordCount > 0 && (
                <span className="text-xs text-[#6B7A93]">{wordCount} words</span>
              )}
              {transcript && (
                <>
                  <button
                    onClick={copyText}
                    className="text-xs text-[#6B7A93] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    Copy
                  </button>
                  <button
                    onClick={clearText}
                    className="text-xs text-[#6B7A93] hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Text area */}
          <div className="p-5 min-h-[180px] relative">
            {!transcript && !interimText && !isListening && (
              <div className="absolute inset-5 flex items-center justify-center">
                <p className="text-[#6B7A93]/50 text-sm text-center">
                  Click the microphone button below and start speaking...<br />
                  Your words will appear here in real-time.
                </p>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={transcript + interimText}
              readOnly
              className="w-full min-h-[160px] bg-transparent text-white/90 text-sm leading-relaxed resize-none focus:outline-none font-mono"
              style={{ color: interimText ? undefined : "#E2E8F0" }}
            />
            {isListening && (
              <div className="absolute bottom-5 right-5 flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-1 bg-cyan-500 rounded-full wave-bar" style={{ height: 8 }} />
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 px-5 py-5 border-t border-white/5 bg-white/[0.02]">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`relative flex items-center gap-3 px-8 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                isListening
                  ? "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                  : "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-500 hover:to-cyan-500 glow-blue"
              }`}
            >
              {isListening ? (
                <>
                  <div className="w-3 h-3 rounded-sm bg-red-400" />
                  Stop Recording
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  Start Speaking
                </>
              )}
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-xl btn-pulse-ring border-red-500/50" />
                  <span className="absolute inset-0 rounded-xl btn-pulse-ring border-red-500/50" style={{ animationDelay: "0.8s" }} />
                </>
              )}
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs text-[#6B7A93] text-center">
          Uses your browser&apos;s built-in speech recognition (Chrome/Edge). No data sent anywhere.
        </p>
      </div>
    </section>
  );
}

// Type declarations for Web Speech API
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}
