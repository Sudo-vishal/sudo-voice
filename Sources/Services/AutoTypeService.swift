import ApplicationServices
import AppKit
import Foundation
import UserNotifications

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

    // MARK: - Accessibility Read-back

    /// The focused UI element. The system-wide route returns kAXErrorCannotComplete in
    /// some contexts even when a text area IS focused (verified against TextEdit), so fall
    /// back to querying the frontmost application directly — that route works.
    private func focusedElement() -> AXUIElement? {
        var systemRef: CFTypeRef?
        if AXUIElementCopyAttributeValue(AXUIElementCreateSystemWide(),
                                         kAXFocusedUIElementAttribute as CFString, &systemRef) == .success,
           let focused = systemRef, CFGetTypeID(focused) == AXUIElementGetTypeID() {
            return (focused as! AXUIElement)
        }

        guard let pid = NSWorkspace.shared.frontmostApplication?.processIdentifier else { return nil }
        var appRef: CFTypeRef?
        guard AXUIElementCopyAttributeValue(AXUIElementCreateApplication(pid),
                                            kAXFocusedUIElementAttribute as CFString, &appRef) == .success,
              let focused = appRef, CFGetTypeID(focused) == AXUIElementGetTypeID() else { return nil }
        return (focused as! AXUIElement)
    }

    /// Text of the focused element plus the caret offset (UTF-16), or nil when the app
    /// exposes no AX text: web views, Electron, secure fields.
    func focusedTextSnapshot() -> (text: String, caret: Int?)? {
        guard AXIsProcessTrusted(), let element = focusedElement() else { return nil }

        var valueRef: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXValueAttribute as CFString, &valueRef) == .success,
              let text = valueRef as? String else { return nil }

        var caret: Int?
        var rangeRef: CFTypeRef?
        if AXUIElementCopyAttributeValue(element, kAXSelectedTextRangeAttribute as CFString, &rangeRef) == .success,
           let rangeValue = rangeRef,
           CFGetTypeID(rangeValue) == AXValueGetTypeID() {
            var range = CFRange()
            if AXValueGetValue(rangeValue as! AXValue, .cfRange, &range) {
                caret = range.location
            }
        }
        return (text, caret)
    }

    /// Everything before the caret. Falls back to the whole value when the app exposes
    /// no selection range.
    private func headBeforeCaret(_ snapshot: (text: String, caret: Int?)) -> String {
        guard let caret = snapshot.caret,
              caret >= 0, caret <= snapshot.text.utf16.count,
              let index = String.Index(String.UTF16View.Index(utf16Offset: caret, in: snapshot.text),
                                       within: snapshot.text) else {
            return snapshot.text
        }
        return String(snapshot.text[..<index])
    }

    /// Erase `count` characters and CONFIRM through AX that they are gone.
    /// Blind counting has twice left exactly 3 characters behind on a fully-counted,
    /// fully-paced erase ("NeeNeed three things") — the count model is wrong in some way
    /// we cannot see from this side, so the polish path verifies instead of assuming.
    /// Returns false only when the erase could not be confirmed clean; the caller must
    /// then NOT paste (leaving unformatted text beats corrupting the document).
    func verifiedErase(_ count: Int, expectedSuffix: String) -> Bool {
        guard AXIsProcessTrusted(), count > 0 else { return false }

        // Establish where the text should end up. If AX can't see the text we just typed,
        // fall back to today's blind behavior — no regression, best effort.
        guard let before = focusedTextSnapshot() else {
            logToFile("verifiedErase: no AX text in focused element — blind erase")
            deleteCharacters(count)
            return true
        }
        let beforeHead = headBeforeCaret(before)
        guard beforeHead.hasSuffix(expectedSuffix) else {
            logToFile("verifiedErase: AX text does not end with what we typed — blind erase")
            deleteCharacters(count)
            return true
        }
        let targetHead = String(beforeHead.dropLast(expectedSuffix.count))

        deleteCharacters(count)

        // Two correction rounds max.
        for round in 1...3 {
            usleep(80_000)  // let the target app apply the backspaces
            guard let after = focusedTextSnapshot() else {
                logToFile("verifiedErase: AX read-back lost after delete — assuming clean")
                return true
            }
            let afterHead = headBeforeCaret(after)

            guard afterHead.hasPrefix(targetHead) else {
                logToFile("verifiedErase: text diverged from target (app mutated it?) — aborting")
                logSnapshotTails(before: beforeHead, after: afterHead)
                return false
            }
            let residual = afterHead.count - targetHead.count

            if residual == 0 {
                logToFile(round == 1 ? "verifiedErase: clean on first pass"
                                     : "verifiedErase: clean after \(round - 1) correction round(s)")
                return true
            }
            if round == 3 {
                logToFile("verifiedErase: \(residual) residual after 2 correction rounds — aborting")
                logSnapshotTails(before: beforeHead, after: afterHead)
                return false
            }

            logToFile("verifiedErase: \(count) requested, \(residual) residual, correcting (round \(round))")
            logSnapshotTails(before: beforeHead, after: afterHead)
            deleteCharacters(residual)
        }
        return false
    }

    /// Instrumentation for the still-unexplained residue: exactly which characters did the
    /// target refuse to delete, and did anything mutate the text behind our back?
    private func logSnapshotTails(before: String, after: String) {
        func tail(_ s: String) -> String {
            String(s.suffix(12))
                .replacingOccurrences(of: "\n", with: "\\n")
                .replacingOccurrences(of: "\t", with: "\\t")
        }
        logToFile("verifiedErase: tail before=\"\(tail(before))\" after=\"\(tail(after))\"")
    }

    // MARK: - Paste Text (Clipboard + Cmd+V)

    /// Paste text at the current cursor position via clipboard + Cmd+V.
    /// Multi-line text must never be typed: a Return keystroke SENDS the message
    /// mid-list in WhatsApp/Slack/Teams. Restores the user's clipboard afterwards.
    func pasteText(_ text: String) {
        guard AXIsProcessTrusted() else {
            // Without Accessibility, CGEvent key posting is blocked — same fallback
            // as typeText: leave the text on the clipboard so manual Cmd+V works.
            let pasteboard = NSPasteboard.general
            pasteboard.clearContents()
            pasteboard.setString(text, forType: .string)
            logToFile("pasteText: FAILED (clipboard left for manual paste)")
            showManualPasteNotification()
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

        // Confirm through AX once the target app has had time to apply the paste.
        // Electron/web views often expose no text at all: that is UNKNOWN, not a
        // failure, so preserve today's clipboard-restore behavior without a toast.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            guard let self else { return }

            if let after = self.focusedTextSnapshot() {
                let pastedTail = self.headBeforeCaret(after)
                let expectedTail = String(text.suffix(80))
                guard !expectedTail.isEmpty, pastedTail.hasSuffix(expectedTail) else {
                    let pasteboard = NSPasteboard.general
                    pasteboard.clearContents()
                    pasteboard.setString(text, forType: .string)
                    logToFile("pasteText: FAILED (clipboard left for manual paste)")
                    self.showManualPasteNotification()
                    return
                }
                logToFile("pasteText: verified")
            } else {
                logToFile("pasteText: unverifiable")
            }

            // The receiving app reads the clipboard asynchronously — restoring too
            // early wipes the text mid-paste. Keep the established 600ms total margin.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) {
                let pasteboard = NSPasteboard.general
                pasteboard.clearContents()
                if let previous {
                    pasteboard.setString(previous, forType: .string)
                }
                logToFile("pasteText — clipboard restored")
            }
        }
    }

    private func showManualPasteNotification() {
        // UserNotifications requires a real .app bundle proxy. SwiftPM's bare
        // debug executable has none, and calling current() there raises an
        // Objective-C exception. Production builds always have a bundle ID.
        guard Bundle.main.bundleIdentifier != nil else {
            logToFile("pasteText: notification skipped — unbundled debug executable")
            return
        }

        let center = UNUserNotificationCenter.current()
        let deliver = {
            let content = UNMutableNotificationContent()
            content.title = "SudoVoice"
            content.body = "Your text is copied — paste with Cmd+V"
            let request = UNNotificationRequest(
                identifier: "paste-failed-\(UUID().uuidString)",
                content: content,
                trigger: nil
            )
            center.add(request)
        }

        center.getNotificationSettings { settings in
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                deliver()
            case .notDetermined:
                center.requestAuthorization(options: [.alert]) { granted, _ in
                    if granted { deliver() }
                }
            case .denied:
                break
            @unknown default:
                break
            }
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
