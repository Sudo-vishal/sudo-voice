# SudoVoice for Windows

Offline voice-to-text that types wherever your cursor is. Hold **Right Ctrl**,
speak, release — your words appear in whatever app has focus. 100% offline by
default (whisper.cpp); optional Gemini cleanup if you bring an API key.

## Architecture

Electron tray app, no native compilation required:

| Piece | How |
| --- | --- |
| Global push-to-talk | `uiohook-napi` low-level keyboard hook (hold Right Ctrl); falls back to a `Ctrl+Shift+Space` toggle |
| Recording | Hidden renderer window, `getUserMedia` → AudioWorklet → 16 kHz mono WAV |
| Transcription | Pinned [whisper.cpp v1.9.1](https://github.com/ggml-org/whisper.cpp) Windows binaries + ggml model, downloaded on first run into `%APPDATA%/sudovoice` |
| Type at cursor | Clipboard + `Ctrl+V` paste injection (previous clipboard restored) |
| AI cleanup (optional) | Gemini `generateContent`, user-supplied key, offline otherwise |
| UI | Floating terminal-chip indicator (`$ listening…`), settings window, tray menu — SudoVoice navy/green brand |

## Develop

```powershell
cd windows
npm install
npm start          # run the app
npm run test:e2e   # mic-free pipeline test (SAPI TTS → whisper → assert)
npm run dist       # build dist/SudoVoice-Setup.exe (NSIS)
```

CI builds the installer on every push (`.github/workflows/build.yml`) and
attaches `SudoVoice-Setup.exe` to GitHub Releases on tags (`release.yml`).

## First run

The installer is ~100 MB (Electron). On first dictation the app downloads the
whisper engine (~15 MB) and the selected model (base, 142 MB) once. SmartScreen
will warn because v1 is unsigned — "More info → Run anyway".
