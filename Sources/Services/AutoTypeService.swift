import ApplicationServices
import AppKit
import Foundation

final class AutoTypeService {

    // MARK: - Permission

    /// Live check every time — no caching, so granting permission takes effect instantly.
    static func isAccessibilityGranted() -> Bool {
        AXIsProcessTrusted()
    }

    /// Prompt the user to grant accessibility. Call from explicit UI action only.
    static func promptAccessibilityOnce() {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        let options: [String: Any] = [key: true]
        AXIsProcessTrustedWithOptions(options as CFDictionary)
    }

    /// Dummy for menu bar refresh button compatibility.
    func refreshAccessibility() -> Bool {
        return AXIsProcessTrusted()
    }

    // MARK: - Type Text (CGEvent Unicode)

    /// Type text at the current cursor position.
    /// Falls back to clipboard if accessibility not granted.
    func typeText(_ text: String) {
        if AXIsProcessTrusted() {
            logToFile("typeText (CGEvent): \"\(text)\"")
            let source = CGEventSource(stateID: .hidSystemState)
            let maxChunkSize = 18
            let utf16 = Array(text.utf16)

            for i in stride(from: 0, to: utf16.count, by: maxChunkSize) {
                let end = min(i + maxChunkSize, utf16.count)
                let chunk = Array(utf16[i..<end])
                typeUnicodeChunk(chunk, source: source)
                usleep(8_000)
            }
        } else {
            // No Accessibility → CGEvent key posting is ALSO blocked by macOS,
            // so the old "auto Cmd+V" attempt could never fire — and the 400ms
            // clipboard restore then wiped the very text we copied. Net result:
            // user saw nothing typed AND lost the transcription. Now: leave the
            // text on the clipboard so a manual Cmd+V always works; AppState
            // shows a status warning pointing to the Accessibility fix.
            logToFile("No accessibility — text left on clipboard for manual Cmd+V: \"\(text)\"")
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            pasteboard.setString(text, forType: .string)
        }
    }

    // MARK: - Paste Text (Clipboard + Cmd+V)

    /// Paste text at the current cursor position via clipboard + Cmd+V.
    /// Multi-line text must never be typed: a Return keystroke SENDS the message
    /// mid-list in WhatsApp/Slack/Teams. Restores the user's clipboard afterwards.
    func pasteText(_ text: String) {
        guard AXIsProcessTrusted() else {
            // Without Accessibility, CGEvent key posting is blocked — same fallback
            // as typeText: leave the text on the clipboard so manual Cmd+V works.
            logToFile("pasteText — no accessibility, text left on clipboard for manual Cmd+V: \"\(text)\"")
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            pasteboard.setString(text, forType: .string)
            return
        }

        logToFile("pasteText (Cmd+V): \"\(text)\"")
        let pasteboard = NSPasteboard.general
        let previous = pasteboard.string(forType: .string)

        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        let source = CGEventSource(stateID: .hidSystemState)
        if let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 9, keyDown: true),
           let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 9, keyDown: false) {
            keyDown.flags = .maskCommand  // Cmd+V
            keyUp.flags = .maskCommand
            keyDown.post(tap: .cgAnnotatedSessionEventTap)
            keyUp.post(tap: .cgAnnotatedSessionEventTap)
        }

        // The receiving app reads the clipboard asynchronously — restoring too early
        // wipes the text mid-paste and the user gets nothing (see typeText comment).
        // 600ms is the margin that made this reliable. Do not shorten it.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            if let previous {
                pasteboard.setString(previous, forType: .string)
            }
            logToFile("pasteText — clipboard restored")
        }
    }

    // MARK: - Deliver (routing)

    /// Single output entry point. Multi-line → paste (safe in chat apps),
    /// single-line → instant char-by-char typing.
    func deliver(_ text: String) {
        if text.contains("\n") {
            pasteText(text)
        } else {
            typeText(text)
        }
    }

    // MARK: - Delete Text (Backspace via CGEvent)

    /// Deletes above this count are paced — below it, chunk-patch feel is unchanged.
    private static let bulkDeleteThreshold = 30

    /// Delete N characters by sending DELETE key events
    func deleteCharacters(_ count: Int) {
        guard AXIsProcessTrusted(), count > 0 else { return }
        let source = CGEventSource(stateID: .hidSystemState)

        // A 99-char erase at 2ms spacing outran the target app: ~3 backspaces were
        // dropped and left "NeeNeed" in the document. Bulk erases (session polish)
        // get wider spacing plus periodic breathing room; small chunk patches don't.
        let isBulk = count > Self.bulkDeleteThreshold
        let spacing: UInt32 = isBulk ? 6_000 : 2_000
        logToFile(isBulk ? "deleteCharacters: \(count) (bulk paced)" : "deleteCharacters: \(count)")

        for i in 0..<count {
            if let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 51, keyDown: true),
               let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 51, keyDown: false) {
                keyDown.post(tap: .cgAnnotatedSessionEventTap)
                keyUp.post(tap: .cgAnnotatedSessionEventTap)
                usleep(spacing)
            }
            if isBulk && (i + 1) % 25 == 0 { usleep(40_000) }
        }
    }

    /// Delete the last word by sending Option+Delete
    func deleteLastWord() {
        guard AXIsProcessTrusted() else { return }
        logToFile("deleteLastWord")
        let source = CGEventSource(stateID: .hidSystemState)

        if let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 51, keyDown: true),
           let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 51, keyDown: false) {
            keyDown.flags = .maskAlternate  // Option+Delete = delete word
            keyUp.flags = .maskAlternate
            keyDown.post(tap: .cgAnnotatedSessionEventTap)
            keyUp.post(tap: .cgAnnotatedSessionEventTap)
        }
    }

    // MARK: - Private

    private func typeUnicodeChunk(_ utf16Chars: [UInt16], source: CGEventSource?) {
        guard let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: true) else { return }
        keyDown.keyboardSetUnicodeString(stringLength: utf16Chars.count, unicodeString: utf16Chars)
        keyDown.post(tap: .cgAnnotatedSessionEventTap)

        guard let keyUp = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: false) else { return }
        keyUp.keyboardSetUnicodeString(stringLength: utf16Chars.count, unicodeString: utf16Chars)
        keyUp.post(tap: .cgAnnotatedSessionEventTap)
    }
}
