"use client";

import { useState, useRef, useCallback } from "react";

export default function FeedbackForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"feedback" | "bug" | "feature">("feedback");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input requires Chrome or Edge browser.");
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          text += event.results[i][0].transcript + " ";
        }
      }
      if (text) {
        setMessage((prev) => prev + text);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Stop voice if active
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setSubmitting(true);
    try {
      await fetch("https://formsubmit.co/ajax/vishalprasad2442002@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: name || "Anonymous",
          type,
          message,
          _subject: `[SudoVoice ${type}] from ${name || "Anonymous"}`,
        }),
      });
      setSubmitted(true);
      setName("");
      setMessage("");
    } catch {
      window.location.href = `mailto:vishalprasad2442002@gmail.com?subject=${encodeURIComponent(`[SudoVoice ${type}]`)}&body=${encodeURIComponent(`Name: ${name || "Anonymous"}\nType: ${type}\n\n${message}`)}`;
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <section className="py-20 px-6">
        <div className="max-w-lg mx-auto text-center">
          <div className="glass-card glow-card-green rounded-2xl p-10">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">Thank you!</h3>
            <p className="text-[#8FA3BF]">Your feedback helps us make SudoVoice better.</p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-6 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Send another
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="feedback" className="py-20 px-6 relative">
      <div className="max-w-lg mx-auto relative z-10">
        <div className="text-center mb-10">
          <div className="kicker mb-3">$ echo &quot;your thoughts&quot; | sudovoice</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Talk back to us.
          </h2>
          <p className="mt-3 text-[#8FA3BF] text-sm">
            Bug, idea, or a kind word — type it, or fittingly, speak it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card glow-card-purple rounded-2xl p-8 space-y-5">
          {/* Type selector */}
          <div className="flex gap-2">
            {(["feedback", "bug", "feature"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  type === t
                    ? t === "bug"
                      ? "bg-red-500/15 text-red-400 border border-red-500/30"
                      : t === "feature"
                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/5 text-[#5C6E8A] border border-white/5 hover:border-white/10"
                }`}
              >
                {t === "bug" ? "Bug" : t === "feature" ? "Feature Idea" : "Feedback"}
              </button>
            ))}
          </div>

          {/* Name */}
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white placeholder-[#5C6E8A] text-sm focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />

          {/* Message with voice button */}
          <div className="relative">
            <textarea
              placeholder={
                type === "bug"
                  ? "What happened? What did you expect?"
                  : type === "feature"
                  ? "What would you love to see in SudoVoice?"
                  : "Tell us what you think..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
              className="w-full px-4 py-3 pr-14 rounded-xl bg-white/5 border border-white/8 text-white placeholder-[#5C6E8A] text-sm focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all resize-none"
            />
            {/* Voice mic button */}
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute bottom-3 right-3 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                isListening
                  ? "bg-red-500/20 border border-red-500/40 text-red-400"
                  : "bg-white/5 border border-white/10 text-[#5C6E8A] hover:text-cyan-400 hover:border-cyan-500/30"
              }`}
              title={isListening ? "Stop recording" : "Speak your feedback"}
            >
              {isListening ? (
                <div className="w-3 h-3 rounded-sm bg-red-400" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              )}
            </button>
            {isListening && (
              <div className="absolute bottom-3 right-14 flex items-center gap-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-0.5 bg-red-400 rounded-full wave-bar" style={{ height: 6 }} />
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!message.trim() || submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold text-sm hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending..." : "Send Feedback"}
          </button>

          <p className="text-xs text-[#5C6E8A] text-center">
            Goes directly to the developer. No spam, no tracking.
          </p>
        </form>
      </div>
    </section>
  );
}
