## SudoVoice v3.0.0 — insert-once dictation

The Mac app gets a new dictation engine and a home screen, merged from upstream and carrying the full SudoVoice identity and cloud backend.

**New engine (macOS):**
- **Insert-once dictation** — your document is touched exactly once per dictation. No more mid-session patching, flicker, or residue.
- **450ms stop-grace window** — the last words you speak are always captured.
- **Offline-first model loading** — cached Whisper models load with zero network calls.
- Whisper models moved to Application Support — no more Documents-folder permission dialog (existing models migrate automatically).

**New features (macOS):**
- **Home tab** — words dictated, WPM, day streak, weekly chart, recent dictations.
- **Groq cloud transcription** (optional) — whole-session cloud transcription with your own key; local Whisper stays the default.
- Voice commands: "stop", "select all", "press enter". Re-paste last dictation with ⌃⇧⌘V.

**Fixes:**
- AI cleanup no longer translates Hinglish/Hindi — your language is preserved.
- Cleanup output validated: chatbot leaks, length blow-ups, and stray newlines rejected.
- Failed pastes leave the transcript on your clipboard with a notification.
- Smart list formatting, newline-safe paste delivery, relative timestamps.

**All platforms:** Windows installer, Android APK, and the Chrome extension zip ship with this release. Sign-in + Pro licensing run on the live SudoVoice backend.
