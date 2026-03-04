import Foundation

/// Replaces spoken punctuation commands with actual punctuation characters.
/// Applied AFTER LLM cleanup as a deterministic post-processing step.
final class SmartPunctuationService {

    /// Punctuation mappings: longer phrases first to avoid partial matches
    private static let commands: [(pattern: String, replacement: String, attachToPrevious: Bool)] = [
        // Multi-word commands first
        ("new paragraph", "\n\n", false),
        ("new line", "\n", false),
        ("full stop", ".", true),
        ("question mark", "?", true),
        ("exclamation mark", "!", true),
        ("exclamation point", "!", true),
        ("open quote", "\"", false),
        ("close quote", "\"", true),
        ("open paren", "(", false),
        ("close paren", ")", true),
        ("open parenthesis", "(", false),
        ("close parenthesis", ")", true),
        ("open bracket", "[", false),
        ("close bracket", "]", true),
        // Single-word commands
        ("comma", ",", true),
        ("period", ".", true),
        ("colon", ":", true),
        ("semicolon", ";", true),
        ("hyphen", "-", false),
        ("dash", "\u{2014}", false),  // em dash
        ("ellipsis", "...", true),
    ]

    /// Apply smart punctuation replacements to text
    static func apply(_ text: String) -> String {
        var result = text

        for (pattern, replacement, attachToPrev) in commands {
            let escaped = NSRegularExpression.escapedPattern(for: pattern)
            // Match word boundary with optional surrounding spaces
            let regexPattern = "\\s*\\b\(escaped)\\b\\s*"
            guard let regex = try? NSRegularExpression(pattern: regexPattern, options: [.caseInsensitive]) else { continue }

            let effectiveReplacement: String
            if attachToPrev {
                effectiveReplacement = "\(replacement) "
            } else if replacement == "\n" || replacement == "\n\n" {
                effectiveReplacement = replacement
            } else {
                effectiveReplacement = " \(replacement)"
            }

            result = regex.stringByReplacingMatches(
                in: result,
                range: NSRange(result.startIndex..., in: result),
                withTemplate: effectiveReplacement
            )
        }

        // Clean up double spaces
        while result.contains("  ") {
            result = result.replacingOccurrences(of: "  ", with: " ")
        }
        return result.trimmingCharacters(in: .whitespaces)
    }
}
