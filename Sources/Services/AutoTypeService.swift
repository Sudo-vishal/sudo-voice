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
            logToFile("No accessibility — clipboard: \"\(text)\"")
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            pasteboard.setString(text, forType: .string)
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
