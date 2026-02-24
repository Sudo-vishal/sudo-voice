import Carbon
import AppKit

/// Global hotkey service using Carbon API.
/// Default: Cmd+D to toggle recording.
final class HotkeyService {
    private var hotkeyRef: EventHotKeyRef?
    private static var onToggle: (() -> Void)?

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

        // Register Cmd+D (keycode 2 = D)
        let hotkeyID = EventHotKeyID(
            signature: OSType(0x5748_5350), // "WHSP"
            id: 1
        )

        let modifiers: UInt32 = UInt32(cmdKey)

        RegisterEventHotKey(
            UInt32(kVK_ANSI_D),
            modifiers,
            hotkeyID,
            GetApplicationEventTarget(),
            0,
            &hotkeyRef
        )
    }

    func unregister() {
        if let ref = hotkeyRef {
            UnregisterEventHotKey(ref)
            hotkeyRef = nil
        }
        Self.onToggle = nil
    }

    deinit {
        unregister()
    }
}
