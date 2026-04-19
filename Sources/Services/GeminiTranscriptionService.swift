import Foundation

/// Cloud transcription — transcribes + cleans in one API call.
/// Supports Gemini direct API and OpenRouter (as fallback when Gemini quota exhausted).
final class GeminiTranscriptionService {

    /// Transcribe audio. Tries OpenRouter first (if key available), falls back to Gemini direct.
    func transcribe(
        audioSamples: [Float],
        language: String,
        apiKey: String,
        openRouterKey: String = "",
        customInstructions: String = "",
        vocabulary: String = ""
    ) async throws -> String {
        let wavData = createWAV(from: audioSamples, sampleRate: 16000)
        let base64Audio = wavData.base64EncodedString()
        let systemPrompt = buildPrompt(language: language, customInstructions: customInstructions, vocabulary: vocabulary)

        var rawResult: String = ""

        // Try OpenRouter first (separate quota, no daily limits)
        if !openRouterKey.isEmpty {
            do {
                let result = try await transcribeViaOpenRouter(
                    base64Audio: base64Audio,
                    systemPrompt: systemPrompt,
                    apiKey: openRouterKey
                )
                if !result.isEmpty {
                    logToFile("[Provider: OpenRouter]")
                    rawResult = result
                }
            } catch {
                logToFile("OpenRouter failed: \(error.localizedDescription) — trying Gemini direct")
            }
        }

        // Fallback to Gemini direct
        if rawResult.isEmpty {
            guard !apiKey.isEmpty else {
                throw GeminiError.noApiKey
            }
            rawResult = try await transcribeViaGemini(
                base64Audio: base64Audio,
                systemPrompt: systemPrompt,
                apiKey: apiKey
            )
        }

        // Post-process: fix known misheard words
        return applyCorrections(rawResult)
    }

    // MARK: - OpenRouter (OpenAI-compatible)

    private func transcribeViaOpenRouter(
        base64Audio: String,
        systemPrompt: String,
        apiKey: String
    ) async throws -> String {
        let url = URL(string: "https://openrouter.ai/api/v1/chat/completions")!

        let body: [String: Any] = [
            "model": "google/gemini-2.5-flash",
            "messages": [
                ["role": "system", "content": systemPrompt],
                ["role": "user", "content": [
                    [
                        "type": "input_audio",
                        "input_audio": [
                            "data": base64Audio,
                            "format": "wav"
                        ]
                    ],
                    [
                        "type": "text",
                        "text": "Transcribe this audio."
                    ]
                ] as [[String: Any]]]
            ],
            "temperature": 0.1,
            "max_tokens": 500
        ]

        let jsonData = try JSONSerialization.data(withJSONObject: body)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = jsonData
        request.timeoutInterval = 8

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GeminiError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let errorBody = String(data: data, encoding: .utf8) ?? "unknown"
            logToFile("OpenRouter error \(httpResponse.statusCode): \(errorBody.prefix(200))")
            throw GeminiError.apiError(httpResponse.statusCode, errorBody)
        }

        // Parse OpenAI-compatible response
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let first = choices.first,
              let message = first["message"] as? [String: Any],
              let text = message["content"] as? String
        else {
            throw GeminiError.parseError
        }

        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed == "[SILENCE]" || trimmed.isEmpty { return "" }
        return trimmed
    }

    // MARK: - Gemini Direct

    private func transcribeViaGemini(
        base64Audio: String,
        systemPrompt: String,
        apiKey: String
    ) async throws -> String {
        let url = URL(string: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=\(apiKey)")!

        let body: [String: Any] = [
            "system_instruction": [
                "parts": [["text": systemPrompt]]
            ],
            "contents": [
                [
                    "parts": [
                        [
                            "inline_data": [
                                "mime_type": "audio/wav",
                                "data": base64Audio
                            ]
                        ],
                        [
                            "text": "Transcribe this audio."
                        ]
                    ]
                ]
            ],
            "generationConfig": [
                "temperature": 0.1,
                "maxOutputTokens": 500
            ]
        ]

        let jsonData = try JSONSerialization.data(withJSONObject: body)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = jsonData
        request.timeoutInterval = 5

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw GeminiError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let errorBody = String(data: data, encoding: .utf8) ?? "unknown"
            logToFile("Gemini API error \(httpResponse.statusCode): \(errorBody.prefix(200))")
            throw GeminiError.apiError(httpResponse.statusCode, errorBody)
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let candidates = json["candidates"] as? [[String: Any]],
              let first = candidates.first,
              let content = first["content"] as? [String: Any],
              let parts = content["parts"] as? [[String: Any]],
              let text = parts.first?["text"] as? String
        else {
            throw GeminiError.parseError
        }

        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed == "[SILENCE]" || trimmed.isEmpty { return "" }
        logToFile("[Provider: Gemini direct]")
        return trimmed
    }

    // MARK: - Post-Processing Corrections

    /// Fix known misheard words via case-insensitive replacement
    private func applyCorrections(_ text: String) -> String {
        // Correction pairs: [misheard pattern : correct word]
        // Ordered longest-first to prevent partial matches
        let corrections: [(pattern: String, replacement: String)] = [
            // Common misheards for tech terms
            ("perplex city", "Perplexity"),
            ("perplexcity", "Perplexity"),
            ("purchase city", "Perplexity"),
            ("perplexed city", "Perplexity"),
            ("perplex it", "Perplexity"),
            ("open your eye", "OpenAI"),
            ("open AI", "OpenAI"),
            ("open ai", "OpenAI"),
            ("chat GPT", "ChatGPT"),
            ("chat gpt", "ChatGPT"),
            ("whisper kit", "WhisperKit"),
            ("indian whisper", "IndianWhisper"),
            ("screen sage", "ScreenSage"),
            ("quota hit", "QuotaHit"),
            ("ai with dhruv", "AiwithDhruv"),
            ("deep seek", "DeepSeek"),
            ("next js", "Next.js"),
            ("swift ui", "SwiftUI"),
            ("core ml", "CoreML"),
            ("fast api", "FastAPI"),
            ("web socket", "WebSocket"),
        ]

        var result = text
        for (pattern, replacement) in corrections {
            // Case-insensitive replacement
            if let range = result.range(of: pattern, options: .caseInsensitive) {
                result = result.replacingCharacters(in: range, with: replacement)
            }
        }
        return result
    }

    // MARK: - Helpers

    private func buildPrompt(language: String, customInstructions: String, vocabulary: String = "") -> String {
        var prompt = """
        You are a voice transcription assistant. Transcribe EXACTLY what the speaker says.
        The speaker has an Indian English accent and may use Hinglish (Hindi-English mix).
        Rules:
        - Output ONLY the transcribed text, nothing else
        - Write the EXACT words the speaker says — do NOT change, replace, or rephrase words
        - Add punctuation and capitalization naturally
        - Convert spoken numbers to digits when appropriate
        - Do NOT add any explanation, prefix, or formatting
        - Do NOT substitute similar-sounding words — transcribe what was actually said
        - If the audio is silence or noise, respond with exactly: [SILENCE]
        """

        if language == "hi" {
            prompt += "\n- The speaker is primarily speaking Hindi. Transliterate to English text."
        }
        if !customInstructions.isEmpty {
            prompt += "\n- Additional style: \(customInstructions)"
        }

        // Custom vocabulary — words the speaker frequently uses
        let vocabList: String
        if !vocabulary.isEmpty {
            vocabList = vocabulary
        } else {
            vocabList = ""
        }

        // Default tech vocabulary (speaker works in AI/tech)
        let defaultVocab = """
        OpenAI, Perplexity, Claude, Anthropic, Gemini, Groq, OpenRouter, DeepSeek, Moonshot, \
        WhisperKit, IndianWhisper, ScreenSage, QuotaHit, Onsite, Vercel, Supabase, \
        API, SDK, WebSocket, LLM, RAG, MCP, FastAPI, Next.js, SwiftUI, CoreML, \
        GPT, ChatGPT, Cursor, GitHub, LinkedIn, YouTube, Instagram, \
        n8n, Upwork, Fiverr, SaaS, AI agent, prompt, token, fine-tune, \
        Dhruv, AiwithDhruv, Euron, Bartisans, Malavika
        """

        let allVocab = vocabList.isEmpty ? defaultVocab : "\(vocabList), \(defaultVocab)"
        prompt += "\n\nIMPORTANT — The speaker frequently uses these terms. When you hear something similar, use the correct spelling:\n\(allVocab)"
        return prompt
    }

    /// Convert Float32 PCM samples to WAV Data (16-bit, 16kHz, mono)
    private func createWAV(from samples: [Float], sampleRate: Int) -> Data {
        let numSamples = samples.count
        let bitsPerSample = 16
        let numChannels = 1
        let byteRate = sampleRate * numChannels * bitsPerSample / 8
        let blockAlign = numChannels * bitsPerSample / 8
        let dataSize = numSamples * blockAlign
        let fileSize = 36 + dataSize

        var data = Data()

        // RIFF header
        data.append(contentsOf: [0x52, 0x49, 0x46, 0x46]) // "RIFF"
        data.append(contentsOf: withUnsafeBytes(of: UInt32(fileSize).littleEndian) { Array($0) })
        data.append(contentsOf: [0x57, 0x41, 0x56, 0x45]) // "WAVE"

        // fmt chunk
        data.append(contentsOf: [0x66, 0x6D, 0x74, 0x20]) // "fmt "
        data.append(contentsOf: withUnsafeBytes(of: UInt32(16).littleEndian) { Array($0) })
        data.append(contentsOf: withUnsafeBytes(of: UInt16(1).littleEndian) { Array($0) })
        data.append(contentsOf: withUnsafeBytes(of: UInt16(numChannels).littleEndian) { Array($0) })
        data.append(contentsOf: withUnsafeBytes(of: UInt32(sampleRate).littleEndian) { Array($0) })
        data.append(contentsOf: withUnsafeBytes(of: UInt32(byteRate).littleEndian) { Array($0) })
        data.append(contentsOf: withUnsafeBytes(of: UInt16(blockAlign).littleEndian) { Array($0) })
        data.append(contentsOf: withUnsafeBytes(of: UInt16(bitsPerSample).littleEndian) { Array($0) })

        // data chunk
        data.append(contentsOf: [0x64, 0x61, 0x74, 0x61]) // "data"
        data.append(contentsOf: withUnsafeBytes(of: UInt32(dataSize).littleEndian) { Array($0) })

        for sample in samples {
            let clamped = max(-1.0, min(1.0, sample))
            let int16 = Int16(clamped * 32767.0)
            data.append(contentsOf: withUnsafeBytes(of: int16.littleEndian) { Array($0) })
        }

        return data
    }
}

enum GeminiError: LocalizedError {
    case noApiKey
    case invalidResponse
    case apiError(Int, String)
    case parseError

    var errorDescription: String? {
        switch self {
        case .noApiKey: return "No API key set"
        case .invalidResponse: return "Invalid response"
        case .apiError(let code, _): return "API error: \(code)"
        case .parseError: return "Failed to parse response"
        }
    }
}
