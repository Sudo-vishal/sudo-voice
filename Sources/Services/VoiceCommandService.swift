import Foundation

/// Voice commands detected from raw Whisper output
enum VoiceCommand {
    case scratchThat    // delete last chunk
    case deleteWord     // delete last word
    case clearAll       // delete everything typed this session
    case copy           // copy lastTranscription to NSPasteboard
    case paste          // send Cmd+V to active app
    case cut            // copy lastTranscription + delete it from active app
    case stopDictation  // stop recording ("stop", "I'm done")
    case selectAll      // send Cmd+A to active app
    case pressEnter     // send Return key to active app
    case none           // not a command, continue normal processing
}

/// Detects voice commands in raw Whisper transcription BEFORE LLM cleanup.
final class VoiceCommandService {

    private static let scratchPhrases: Set<String> = [
        "scratch that", "scratch this",
        "undo that", "undo this",
        "delete that", "delete this",
        "remove that", "remove this",
        "never mind", "nevermind",
    ]

    private static let deleteWordPhrases: Set<String> = [
        "delete word", "delete last word",
        "backspace", "back space",
    ]

    private static let clearAllPhrases: Set<String> = [
        "clear all", "clear everything",
        "delete all", "delete everything",
        "start over", "erase all",
    ]

    private static let copyPhrases: Set<String> = [
        "copy", "copy that", "copy this", "copy it", "copy all",
        "copied", "copied that", "copies that",
    ]

    private static let pastePhrases: Set<String> = [
        "paste", "paste here", "paste it", "paste this",
        "pasted", "pasted here",
    ]

    private static let cutPhrases: Set<String> = [
        "cut", "cut that", "cut this", "cut it",
    ]

    // Exact-match ONLY — "stop" is far too common inside real dictation
    // ("the bus didn't stop") to allow prefix/suffix matching.
    private static let stopPhrases: Set<String> = [
        "stop", "stop recording", "stop listening", "stop now",
        "i'm done", "im done", "that's it", "thats it",
    ]

    private static let selectAllPhrases: Set<String> = [
        "select all", "select everything",
        "highlight all", "highlight everything",
    ]

    private static let pressEnterPhrases: Set<String> = [
        "press enter", "hit enter", "press return", "hit return",
        "new line", "next line", "enter",
    ]

    /// Detect if raw Whisper output is a voice command.
    static func detect(_ rawText: String) -> VoiceCommand {
        let normalized = rawText
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased()
            .replacingOccurrences(of: ".", with: "")
            .replacingOccurrences(of: ",", with: "")
            .replacingOccurrences(of: "!", with: "")
            .replacingOccurrences(of: "?", with: "")
            .trimmingCharacters(in: .whitespaces)

        // Exact match
        if scratchPhrases.contains(normalized) { return .scratchThat }
        if deleteWordPhrases.contains(normalized) { return .deleteWord }
        if clearAllPhrases.contains(normalized) { return .clearAll }
        if copyPhrases.contains(normalized) { return .copy }
        if pastePhrases.contains(normalized) { return .paste }
        if cutPhrases.contains(normalized) { return .cut }
        if stopPhrases.contains(normalized) { return .stopDictation }
        if selectAllPhrases.contains(normalized) { return .selectAll }
        if pressEnterPhrases.contains(normalized) { return .pressEnter }

        // Prefix match (Whisper might add extra words after)
        for phrase in scratchPhrases {
            if normalized.hasPrefix(phrase) && normalized.count < phrase.count + 10 {
                return .scratchThat
            }
        }
        for phrase in clearAllPhrases {
            if normalized.hasPrefix(phrase) && normalized.count < phrase.count + 10 {
                return .clearAll
            }
        }
        for phrase in copyPhrases {
            if normalized.hasPrefix(phrase) && normalized.count < phrase.count + 10 {
                return .copy
            }
        }
        for phrase in pastePhrases {
            if normalized.hasPrefix(phrase) && normalized.count < phrase.count + 10 {
                return .paste
            }
        }
        for phrase in cutPhrases {
            if normalized.hasPrefix(phrase) && normalized.count < phrase.count + 10 {
                return .cut
            }
        }

        // Suffix/contains match (Whisper often prepends filler like "now can you", "okay")
        // Only trigger if the utterance is short enough to be a command (< 40 chars)
        if normalized.count < 40 {
            for phrase in scratchPhrases {
                if normalized.hasSuffix(phrase) || normalized.contains(phrase) {
                    return .scratchThat
                }
            }
            for phrase in deleteWordPhrases {
                if normalized.hasSuffix(phrase) || normalized.contains(phrase) {
                    return .deleteWord
                }
            }
            for phrase in clearAllPhrases {
                if normalized.hasSuffix(phrase) || normalized.contains(phrase) {
                    return .clearAll
                }
            }
            for phrase in copyPhrases {
                if normalized.hasSuffix(phrase) || normalized.contains(phrase) {
                    return .copy
                }
            }
            for phrase in pastePhrases {
                if normalized.hasSuffix(phrase) || normalized.contains(phrase) {
                    return .paste
                }
            }
            for phrase in cutPhrases {
                if normalized.hasSuffix(phrase) || normalized.contains(phrase) {
                    return .cut
                }
            }
            for phrase in selectAllPhrases {
                if normalized.hasSuffix(phrase) {
                    return .selectAll
                }
            }
        }

        return .none
    }
}
