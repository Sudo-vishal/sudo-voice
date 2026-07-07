import SwiftUI
import AppKit

/// SudoVoice design tokens — terminal phosphor identity.
/// Matches the website design system: deep navy surfaces, phosphor green
/// primary (#00E676), sky cyan secondary (#4FC3F7), mono accents.
enum SVTheme {
    // MARK: SwiftUI colors
    static let green = Color(red: 0.0, green: 0.902, blue: 0.463)       // #00E676
    static let greenDark = Color(red: 0.012, green: 0.078, blue: 0.043) // #03140B (text on green)
    static let cyan = Color(red: 0.310, green: 0.765, blue: 0.969)      // #4FC3F7
    static let amber = Color(red: 1.0, green: 0.741, blue: 0.180)       // #FFBD2E
    static let bg = Color(red: 0.016, green: 0.027, blue: 0.059)        // #04070F
    static let panel = Color(red: 0.039, green: 0.071, blue: 0.125)     // #0A1220
    static let border = Color(red: 0.110, green: 0.161, blue: 0.251)    // #1C2940
    static let muted = Color(red: 0.361, green: 0.431, blue: 0.541)     // #5C6E8A
    static let secondaryText = Color(red: 0.561, green: 0.639, blue: 0.749) // #8FA3BF

    // MARK: AppKit colors (floating indicator, NSWindow chrome)
    static let nsGreen = NSColor(red: 0.0, green: 0.902, blue: 0.463, alpha: 1.0)
    static let nsCyan = NSColor(red: 0.310, green: 0.765, blue: 0.969, alpha: 1.0)
    static let nsPanel = NSColor(red: 0.039, green: 0.071, blue: 0.125, alpha: 1.0)
    static let nsBorder = NSColor(red: 0.110, green: 0.161, blue: 0.251, alpha: 1.0)
    static let nsMuted = NSColor(red: 0.561, green: 0.639, blue: 0.749, alpha: 1.0)
}
