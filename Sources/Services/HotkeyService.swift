import Carbon
import AppKit

/// Global hotkey service using Carbon API.
/// Default: Cmd+D. Configurable via UserDefaults.
final class HotkeyService {
    private var hotkeyRef: EventHotKeyRef?
    private static var onToggle: (() -> Void)?

    /// Current hotkey keycode (default: kVK_ANSI_D = 2)
    var keyCode: UInt32 {
        get {
            let val = UserDefaults.standard.integer(forKey: "hotkeyKeyCode")
            return val > 0 ? UInt32(val) : UInt32(kVK_ANSI_D)
        }
        set { UserDefaults.standard.set(Int(newValue), forKey: "hotkeyKeyCode") }
    }

    /// Current hotkey modifiers (default: cmdKey)
    var modifiers: UInt32 {
        get {
            let val = UserDefaults.standard.integer(forKey: "hotkeyModifiers")
            return val > 0 ? UInt32(val) : UInt32(cmdKey)
        }
        set { UserDefaults.standard.set(Int(newValue), forKey: "hotkeyModifiers") }
    }

    /// Human-readable hotkey display string
    var displayString: String {
        var parts: [String] = []
        if modifiers & UInt32(cmdKey) != 0 { parts.append("Cmd") }
        if modifiers & UInt32(optionKey) != 0 { parts.append("Opt") }
        if modifiers & UInt32(controlKey) != 0 { parts.append("Ctrl") }
        if modifiers & UInt32(shiftKey) != 0 { parts.append("Shift") }
        parts.append(keyName(for: keyCode))
        return parts.joined(separator: " + ")
    }

    func register(onToggle: @escaping () -> Void) {
        Self.onToggle = onToggle

        // Install Carbon event handler for hotkeys
        var eventType = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )

        InstallEventHandler(
            GetApplicationEventTarget(),
            { (_, event, _) -> OSStatus in
                HotkeyService.onToggle?()
                return noErr
            },
            1,
            &eventType,
            nil,
            nil
        )

        registerHotkey()
    }

    /// Re-register with current keyCode/modifiers (call after user changes hotkey)
    func reregister() {
        unregisterHotkey()
        registerHotkey()
    }

    /// Update hotkey and re-register
    func updateHotkey(keyCode: UInt32, modifiers: UInt32) {
        self.keyCode = keyCode
        self.modifiers = modifiers
        reregister()
        logToFile("Hotkey updated to: \(displayString)")
    }

    private func registerHotkey() {
        let hotkeyID = EventHotKeyID(
            signature: OSType(0x5748_5350), // "WHSP"
            id: 1
        )

        RegisterEventHotKey(
            keyCode,
            modifiers,
            hotkeyID,
            GetApplicationEventTarget(),
            0,
            &hotkeyRef
        )
        logToFile("Hotkey registered: \(displayString)")
    }

    private func unregisterHotkey() {
        if let ref = hotkeyRef {
            UnregisterEventHotKey(ref)
            hotkeyRef = nil
        }
    }

    func unregister() {
        unregisterHotkey()
        Self.onToggle = nil
    }

    deinit {
        unregister()
    }

    // MARK: - Key Name Lookup

    private func keyName(for code: UInt32) -> String {
        switch Int(code) {
        case kVK_ANSI_A: return "A"
        case kVK_ANSI_B: return "B"
        case kVK_ANSI_C: return "C"
        case kVK_ANSI_D: return "D"
        case kVK_ANSI_E: return "E"
        case kVK_ANSI_F: return "F"
        case kVK_ANSI_G: return "G"
        case kVK_ANSI_H: return "H"
        case kVK_ANSI_I: return "I"
        case kVK_ANSI_J: return "J"
        case kVK_ANSI_K: return "K"
        case kVK_ANSI_L: return "L"
        case kVK_ANSI_M: return "M"
        case kVK_ANSI_N: return "N"
        case kVK_ANSI_O: return "O"
        case kVK_ANSI_P: return "P"
        case kVK_ANSI_Q: return "Q"
        case kVK_ANSI_R: return "R"
        case kVK_ANSI_S: return "S"
        case kVK_ANSI_T: return "T"
        case kVK_ANSI_U: return "U"
        case kVK_ANSI_V: return "V"
        case kVK_ANSI_W: return "W"
        case kVK_ANSI_X: return "X"
        case kVK_ANSI_Y: return "Y"
        case kVK_ANSI_Z: return "Z"
        case kVK_ANSI_0: return "0"
        case kVK_ANSI_1: return "1"
        case kVK_ANSI_2: return "2"
        case kVK_ANSI_3: return "3"
        case kVK_ANSI_4: return "4"
        case kVK_ANSI_5: return "5"
        case kVK_ANSI_6: return "6"
        case kVK_ANSI_7: return "7"
        case kVK_ANSI_8: return "8"
        case kVK_ANSI_9: return "9"
        case kVK_Space: return "Space"
        case kVK_Return: return "Return"
        case kVK_F1: return "F1"
        case kVK_F2: return "F2"
        case kVK_F3: return "F3"
        case kVK_F4: return "F4"
        case kVK_F5: return "F5"
        case kVK_F6: return "F6"
        case kVK_F7: return "F7"
        case kVK_F8: return "F8"
        case kVK_F9: return "F9"
        case kVK_F10: return "F10"
        case kVK_F11: return "F11"
        case kVK_F12: return "F12"
        default: return "Key(\(code))"
        }
    }
}
