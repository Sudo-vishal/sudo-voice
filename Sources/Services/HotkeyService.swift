import Carbon
import AppKit

/// Push-to-talk modifier key choice. Modifier-only keys can't be registered
/// via Carbon's RegisterEventHotKey, so we use NSEvent.addGlobalMonitorForEvents(.flagsChanged)
/// and disambiguate via event.keyCode (left vs right Option, etc.).
enum PTTKey: String, CaseIterable, Identifiable {
    case disabled = "disabled"
    case rightOption = "rightOption"
    case leftOption = "leftOption"
    case fn = "fn"
    case rightCmd = "rightCmd"
    case rightShift = "rightShift"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .disabled:    return "Off"
        case .rightOption: return "Right Option"
        case .leftOption:  return "Left Option (default)"
        case .fn:          return "Fn"
        case .rightCmd:    return "Right Command"
        case .rightShift:  return "Right Shift"
        }
    }

    /// macOS virtual key code matched against event.keyCode in .flagsChanged events.
    var keyCode: Int {
        switch self {
        case .disabled:    return -1
        case .rightOption: return 61   // 0x3D
        case .leftOption:  return 58   // 0x3A
        case .fn:          return 63   // 0x3F (may not fire on all Macs)
        case .rightCmd:    return 54   // 0x36
        case .rightShift:  return 60   // 0x3C
        }
    }

    /// Modifier flag this key sets on press. We detect press via flag presence,
    /// release via flag absence (combined with matching keyCode for left/right disambiguation).
    var modifierFlag: NSEvent.ModifierFlags {
        switch self {
        case .rightOption, .leftOption: return .option
        case .fn:                        return .function
        case .rightCmd:                  return .command
        case .rightShift:                return .shift
        case .disabled:                  return []
        }
    }
}

/// Global hotkey service using Carbon API.
/// Default: Cmd+D. Configurable via UserDefaults.
final class HotkeyService {
    private enum Hotkey {
        static let signature = OSType(0x5748_5350) // "WHSP"
        static let toggleID: UInt32 = 1
        static let repasteID: UInt32 = 2
        static let repasteKeyCode = UInt32(kVK_ANSI_V)
        // ⌃⇧⌘V — NOT ⌃⌘V: that is Wispr Flow's global "paste last transcript" hotkey,
        // and on a machine running both apps Wispr wins the registration and our
        // handler never fires (observed 2026-07-16). Shift added to stay conflict-free.
        static let repasteModifiers = UInt32(cmdKey | controlKey | shiftKey)
    }

    private var hotkeyRef: EventHotKeyRef?
    private var repasteHotkeyRef: EventHotKeyRef?
    private static var onToggle: (() -> Void)?
    private static var onRepaste: (() -> Void)?
    private static var lastFireTime: Date = .distantPast
    private static let debounceSec: TimeInterval = 0.3

    // Push-to-talk state — separate from the Carbon-based Cmd+D toggle.
    // Coexists with toggle hotkey: both fire independently.
    private var pttMonitor: Any?
    private var pttIsHeld = false
    private var pttOnPress: (() -> Void)?
    private var pttOnRelease: (() -> Void)?

    // 100ms event-level debounce — defends against duplicate flagsChanged events
    // from any source (hardware bounce, multiple monitor instances, OS event
    // flicker). Static so it dedupes across instances if HotkeyService is ever
    // accidentally created twice.
    private static var lastPTTEventTime: Date = .distantPast
    private static let pttDebounceSec: TimeInterval = 0.1

    /// Currently configured PTT key. Persisted in UserDefaults.
    /// Default: Left Option (Right Option is reserved for Wispr Flow on Dhruv's setup).
    var pttKey: PTTKey {
        get { PTTKey(rawValue: UserDefaults.standard.string(forKey: "pttKey") ?? "leftOption") ?? .leftOption }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: "pttKey") }
    }

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

    func register(onToggle: @escaping () -> Void, onRepaste: @escaping () -> Void) {
        Self.onToggle = onToggle
        Self.onRepaste = onRepaste

        // Install Carbon event handler for hotkeys
        var eventType = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )

        InstallEventHandler(
            GetApplicationEventTarget(),
            { (_, event, _) -> OSStatus in
                var hotkeyID = EventHotKeyID()
                let status = GetEventParameter(
                    event,
                    EventParamName(kEventParamDirectObject),
                    EventParamType(typeEventHotKeyID),
                    nil,
                    MemoryLayout<EventHotKeyID>.size,
                    nil,
                    &hotkeyID
                )
                guard status == noErr, hotkeyID.signature == Hotkey.signature else {
                    return noErr
                }

                if hotkeyID.id == Hotkey.repasteID {
                    HotkeyService.onRepaste?()
                    return noErr
                }

                guard hotkeyID.id == Hotkey.toggleID else { return noErr }
                let now = Date()
                guard now.timeIntervalSince(HotkeyService.lastFireTime) > HotkeyService.debounceSec else {
                    return noErr  // Ignore duplicate fires within 300ms
                }
                HotkeyService.lastFireTime = now
                HotkeyService.onToggle?()
                return noErr
            },
            1,
            &eventType,
            nil,
            nil
        )

        registerHotkey()
        registerRepasteHotkey()
    }

    /// Re-register with current keyCode/modifiers (call after user changes hotkey)
    func reregister() {
        unregisterHotkey()
        registerHotkey()
        registerRepasteHotkey()
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
            signature: Hotkey.signature,
            id: Hotkey.toggleID
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

    private func registerRepasteHotkey() {
        let hotkeyID = EventHotKeyID(
            signature: Hotkey.signature,
            id: Hotkey.repasteID
        )

        let status = RegisterEventHotKey(
            Hotkey.repasteKeyCode,
            Hotkey.repasteModifiers,
            hotkeyID,
            GetApplicationEventTarget(),
            0,
            &repasteHotkeyRef
        )
        // A silent registration failure (e.g. another app owns the combo) is how
        // the Wispr Flow ⌃⌘V collision went unnoticed — always log the outcome.
        logToFile(status == noErr
            ? "Re-paste hotkey registered: ⌃⇧⌘V"
            : "Re-paste hotkey registration FAILED (status \(status)) — combo may be owned by another app")
        logToFile("Re-paste hotkey registered: Ctrl + Cmd + V")
    }

    private func unregisterHotkey() {
        if let ref = hotkeyRef {
            UnregisterEventHotKey(ref)
            hotkeyRef = nil
        }
        if let ref = repasteHotkeyRef {
            UnregisterEventHotKey(ref)
            repasteHotkeyRef = nil
        }
    }

    func unregister() {
        unregisterHotkey()
        unregisterPTT()
        Self.onToggle = nil
        Self.onRepaste = nil
    }

    deinit {
        unregister()
    }

    // MARK: - Push-to-talk (modifier-only key)

    /// Register a push-to-talk modifier key. Coexists with the Cmd+D toggle.
    /// onPress fires when the configured modifier transitions to held.
    /// onRelease fires when it transitions to released.
    /// Caller decides cancel-on-short-press semantics (we just report the edge transitions).
    func registerPTT(onPress: @escaping () -> Void, onRelease: @escaping () -> Void) {
        unregisterPTT()
        self.pttOnPress = onPress
        self.pttOnRelease = onRelease

        guard pttKey != .disabled else {
            logToFile("PTT disabled — no monitor installed")
            return
        }

        let targetKeyCode = pttKey.keyCode
        let targetFlag = pttKey.modifierFlag

        pttMonitor = NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged) { [weak self] event in
            guard let self = self else { return }
            // Disambiguate left vs right modifier (they share the same flag).
            guard Int(event.keyCode) == targetKeyCode else { return }

            // 100ms debounce — drops duplicate flagsChanged events that fire from
            // hardware bounce, OS event flicker, or unintended monitor duplication.
            // Real human press/release pairs are far apart (>200ms minimum after
            // the cancel guard), so this can't lose a legitimate event.
            let now = Date()
            guard now.timeIntervalSince(HotkeyService.lastPTTEventTime) > HotkeyService.pttDebounceSec else {
                logToFile("PTT debounced: duplicate flagsChanged within \(Int(HotkeyService.pttDebounceSec * 1000))ms")
                return
            }
            HotkeyService.lastPTTEventTime = now

            let isPressed = event.modifierFlags
                .intersection(.deviceIndependentFlagsMask)
                .contains(targetFlag)
            if isPressed && !self.pttIsHeld {
                self.pttIsHeld = true
                self.pttOnPress?()
            } else if !isPressed && self.pttIsHeld {
                self.pttIsHeld = false
                self.pttOnRelease?()
            }
        }
        logToFile("PTT registered: \(pttKey.displayName) (keyCode \(targetKeyCode))")
    }

    /// Re-register PTT with the current pttKey. Call after the user changes the picker.
    func reregisterPTT() {
        guard let onPress = pttOnPress, let onRelease = pttOnRelease else {
            logToFile("PTT reregister skipped: no callbacks set")
            return
        }
        registerPTT(onPress: onPress, onRelease: onRelease)
    }

    /// Update the PTT key and re-register the monitor.
    func updatePTTKey(_ newKey: PTTKey) {
        pttKey = newKey
        reregisterPTT()
        logToFile("PTT key updated to: \(newKey.displayName)")
    }

    func unregisterPTT() {
        if let m = pttMonitor {
            NSEvent.removeMonitor(m)
            pttMonitor = nil
        }
        pttIsHeld = false
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
