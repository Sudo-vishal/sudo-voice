import AVFoundation
import ApplicationServices

enum PermissionStatus {
    case granted
    case denied
    case notDetermined
}

enum PermissionService {

    // MARK: - Microphone

    static func microphoneStatus() -> PermissionStatus {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: return .granted
        case .denied, .restricted: return .denied
        case .notDetermined: return .notDetermined
        @unknown default: return .notDetermined
        }
    }

    static func requestMicrophonePermission() async -> Bool {
        await AVCaptureDevice.requestAccess(for: .audio)
    }

    // MARK: - Accessibility

    static func accessibilityStatus() -> PermissionStatus {
        AXIsProcessTrusted() ? .granted : .denied
    }

    static func requestAccessibilityPermission() {
        let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
        let options: [String: Any] = [key: true]
        AXIsProcessTrustedWithOptions(options as CFDictionary)
    }

    // MARK: - Combined

    static var allGranted: Bool {
        microphoneStatus() == .granted && accessibilityStatus() == .granted
    }
}
