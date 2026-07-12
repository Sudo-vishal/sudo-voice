## SudoVoice v2.6.0 — the cross-platform release

**Windows app launches.** Hold Right Ctrl, speak, release — your words are typed at your cursor in any app. 100% offline (whisper.cpp on-device), system tray, floating terminal indicator, optional AI cleanup with your own Gemini key.

**All three platforms, one release:**
- `SudoVoice-Setup.exe` — Windows 10/11 x64 (unsigned v1: SmartScreen → "More info" → "Run anyway")
- `SudoVoice.dmg` — macOS 14+ Apple Silicon (unsigned: right-click → Open the first time)
- `SudoVoice.apk` — Android 8+ (sideload; debug-signed preview)

**Also in this release:**
- CI now builds every platform on every push; releases are fully automated
- Website: OS-aware downloads, /docs, /changelog
- Optional cloud layer (Supabase + Razorpay) scaffolded for accounts & Pro licensing

First run downloads the Whisper model (~142 MB, one time). Your voice never leaves your device.
