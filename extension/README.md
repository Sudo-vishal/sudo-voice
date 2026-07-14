# SudoVoice Chrome Extension

Voice typing in any browser text field. Toggle with **Alt+Shift+V** (or the
toolbar button), speak, and final phrases are inserted at your cursor —
inputs, textareas, and rich editors (Docs/Notion-style contenteditable).
**Esc** stops. If nothing editable is focused, the text is copied to the
clipboard instead.

Uses the browser's Web Speech API (Chrome's speech service — not offline).
For fully offline dictation, use the SudoVoice desktop/mobile apps.

## Install (until the Web Store listing is live)

1. Download `SudoVoice-Chrome.zip` from the latest GitHub release and unzip
   (or use this `extension/` folder directly).
2. Open `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** → select the folder.

## Publish checklist (Chrome Web Store)

- One-time $5 developer registration
- Upload the zip, listing copy from `website/app/docs`
- Privacy: no data collected; speech handled by Chrome's own service
