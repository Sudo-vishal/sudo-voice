# Whisper AiwithDhruv

Native macOS menu bar app for **live voice-to-text with auto-type** — powered by on-device Whisper AI.

Press `Cmd+D`, speak, and it types wherever your cursor is. No cloud. No API key. Fully offline.

https://github.com/user-attachments/assets/placeholder

## What It Does

- **Live auto-type** — transcribes speech and types it directly into any app (VS Code, Chrome, Slack, Notes, Terminal)
- **Fully offline** — runs on Apple Silicon's Neural Engine via CoreML. Your voice never leaves your Mac
- **~800MB RAM** — 4x lighter than the Python Whisper equivalent (3.2GB)
- **42x real-time** — transcribes 1 min of audio in ~1.4 seconds on M1
- **3-second chunks** — types as you speak, almost real-time
- **Indian English optimized** — works great with Indian accents out of the box

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Speech AI** | [WhisperKit](https://github.com/argmaxinc/WhisperKit) (OpenAI Whisper on CoreML) |
| **Language** | Swift 5.9 |
| **UI** | SwiftUI MenuBarExtra + pure AppKit/CALayer floating indicator |
| **Audio** | AVAudioEngine → 16kHz mono conversion → VAD → chunked transcription |
| **Auto-type** | CGEvent Unicode keystroke injection |
| **Hotkey** | Carbon API `RegisterEventHotKey` (Cmd+D) |
| **Model** | `openai_whisper-base` (~140MB, downloaded once from Hugging Face) |

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Menu Bar App (SwiftUI MenuBarExtra)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ AudioSvc │→ │WhisperKit│→ │ AutoTypeSvc  │  │
│  │ (mic tap)│  │(transcr.)│  │ (CGEvent)    │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
│       ↓                            ↓            │
│  ┌──────────┐              ┌──────────────┐     │
│  │   VAD    │              │  Floating    │     │
│  │ (vDSP)  │              │  Indicator   │     │
│  └──────────┘              │  (CALayer)   │     │
│                            └──────────────┘     │
└─────────────────────────────────────────────────┘
```

**3-Layer Flow:**
1. **AudioCaptureService** — AVAudioEngine mic tap → converts to 16kHz mono → VAD filters silence → accumulates 3s chunks
2. **TranscriptionService** — WhisperKit transcribes each chunk on CoreML Neural Engine
3. **AutoTypeService** — CGEvent injects Unicode keystrokes at cursor position (falls back to clipboard if accessibility not granted)

## Features

- **Cmd+D** global hotkey to toggle recording
- **Floating neon indicator** — draggable, shows LISTENING/AI TYPING/READY with animated wave bars and pulsing glow
- **Menu bar dropdown** — status, last transcription, model picker, Hindi mode toggle, history
- **Hindi/Hinglish mode** — one-click toggle for bilingual speakers
- **Auto-launch on login** — LaunchAgent with auto-restart on crash
- **No Dock icon** — pure menu bar app (LSUIElement)

## Requirements

- macOS 14+ (Sonoma)
- Apple Silicon (M1/M2/M3/M4)
- ~500MB disk (model download)
- Microphone permission
- Accessibility permission (for auto-type)

## Build from Source

```bash
# Clone
git clone https://github.com/aiagentwithdhruv/whisper-aiwithdhruv.git
cd whisper-aiwithdhruv

# Build (release)
swift build -c release

# Create .app bundle
mkdir -p WhisperAiwithDhruv.app/Contents/MacOS
cp .build/release/WhisperAiwithDhruv WhisperAiwithDhruv.app/Contents/MacOS/
cp Sources/App/Info.plist WhisperAiwithDhruv.app/Contents/

# Install
cp -R WhisperAiwithDhruv.app /Applications/

# Launch
open /Applications/WhisperAiwithDhruv.app
```

On first launch:
1. Grant **Microphone** permission when prompted
2. Grant **Accessibility** permission (System Settings → Privacy → Accessibility → toggle ON)
3. Model downloads automatically (~140MB, one-time)

## Project Structure

```
Sources/
├── App/
│   ├── WhisperAiwithDhruvApp.swift   # Entry point, global state, setup
│   └── Info.plist                     # Bundle config (LSUIElement, mic usage)
├── Models/
│   └── AppState.swift                 # Central @Observable state, service coordination
├── Services/
│   ├── AudioCaptureService.swift      # AVAudioEngine mic capture + VAD
│   ├── TranscriptionService.swift     # WhisperKit wrapper
│   ├── AutoTypeService.swift          # CGEvent keystroke injection
│   ├── HotkeyService.swift            # Carbon API global hotkey (Cmd+D)
│   └── PermissionService.swift        # Mic + Accessibility permission checks
└── Views/
    ├── MenuBarView.swift              # Menu bar dropdown UI
    ├── SettingsView.swift             # Settings window (3 tabs)
    └── FloatingIndicator.swift        # Pure AppKit/CALayer neon overlay
```

## Key Design Decisions

| Decision | Why |
|----------|-----|
| **WhisperKit over whisper.cpp** | Native CoreML = Neural Engine acceleration on Apple Silicon |
| **Pure AppKit floating indicator** | SwiftUI NSHostingView crashes in borderless floating windows |
| **Global sharedAppState** | @Environment + @Bindable causes EXC_BAD_ACCESS in MenuBarExtra |
| **Carbon API hotkey** | KeyboardShortcuts package has #Preview macros that break `swift build` CLI |
| **CGEvent over AppleScript** | Direct keystroke injection is faster and supports full Unicode |
| **3s chunk duration** | Balance between latency and transcription accuracy |
| **No language picker** | English 90% + Hindi toggle. No UI bloat for unused languages |

## Comparison

| Feature | macOS Dictation | MacWhisper | Python whisper-live | **This App** |
|---------|----------------|------------|--------------------:|-------------|
| Live auto-type | Yes | No (file-based) | No (terminal) | **Yes** |
| Offline | No (cloud) | Yes | Yes | **Yes** |
| RAM usage | ~200MB | ~1GB | ~3.2GB | **~800MB** |
| Indian accent | Poor | Good | Good | **Great** |
| Menu bar app | Built-in | Separate window | Terminal | **Menu bar** |
| Floating indicator | No | No | No | **Yes** |
| Hindi mode | No | Manual | Manual | **One toggle** |

## Roadmap

- [ ] Android version (Sherpa-ONNX + Whisper base model)
- [ ] Speaker diarization (who said what)
- [ ] Custom vocabulary/hotwords
- [ ] Streaming mode (word-by-word instead of chunk-by-chunk)

## Built With

Built entirely using [Claude Code](https://claude.ai/claude-code) (Anthropic's AI coding agent) in a single session — from zero to working Mac app.

## License

MIT

---

**Made by [AiwithDhruv](https://github.com/aiagentwithdhruv)** | Building AI that actually ships
