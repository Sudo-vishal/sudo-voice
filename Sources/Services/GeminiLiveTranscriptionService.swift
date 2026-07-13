import Foundation

/// Real-time streaming transcription via Gemini Live API (WebSocket).
/// Audio streams continuously — Gemini handles VAD internally.
/// Text arrives incrementally as the user speaks.
final class GeminiLiveTranscriptionService: NSObject, URLSessionWebSocketDelegate {
    private var webSocket: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private var isSetupDone = false

    // Accumulated text within current turn
    private var turnBuffer = ""

    // Callbacks
    var onTranscription: ((String) -> Void)?
    /// v2.6: fires with the ACCUMULATED buffer on every streamed fragment, while
    /// the user is still speaking. This is the Wispr-style perceived-speed win —
    /// buffering everything until turnComplete threw away the entire advantage
    /// of a streaming connection.
    var onPartial: ((String) -> Void)?

    func connect(
        apiKey: String,
        language: String,
        customInstructions: String
    ) async throws {
        disconnect() // clean any previous session

        let urlStr = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=\(apiKey)"
        guard let url = URL(string: urlStr) else {
            throw GeminiError.invalidResponse
        }

        urlSession = URLSession(
            configuration: .default,
            delegate: self,
            delegateQueue: nil
        )
        webSocket = urlSession?.webSocketTask(with: url)
        webSocket?.resume()

        // Build system prompt
        var systemPrompt = """
        You are a real-time voice transcription assistant. Your ONLY job is to output the text the user speaks.
        The speaker has an Indian English accent and may use Hinglish (Hindi-English mix).
        Rules:
        - Output ONLY the transcribed text, nothing else
        - Fix grammar and punctuation naturally
        - Keep the speaker's intent and meaning intact
        - Convert spoken numbers to digits when appropriate
        - Do NOT add any explanation, prefix, label, or formatting
        - Do NOT repeat or reference previous transcriptions
        - If the audio is silence or noise, output nothing at all
        """

        if language == "hi" {
            systemPrompt += "\n- The speaker is primarily speaking Hindi. Transliterate to English text."
        }
        if !customInstructions.isEmpty {
            systemPrompt += "\n- Additional style: \(customInstructions)"
        }

        // Setup message — text-only output, no voice response.
        // v2.6: aggressive endpointing. The REST path already runs a tuned 150ms
        // pause threshold, but this Live path was left on Gemini's default
        // (~800ms+) end-of-speech detection — the main source of "dead air"
        // after finishing a sentence. HIGH sensitivity + 500ms silence window
        // cuts turn-close latency roughly in half without clipping speech.
        // WS 1007 root cause (fixed 2026-07-13): the server rejected the setup frame with
        // "The requested combination of response modalities (TEXT) is not supported by the
        // model." NO Live model supports TEXT output — verified against every model this
        // key can reach:
        //   curl "https://generativelanguage.googleapis.com/v1beta/models?key=$KEY" \
        //     | jq '.models[] | select(.supportedGenerationMethods[]? == "bidiGenerateContent") | .name'
        //   → native-audio-latest, native-audio-preview-09/12-2025, 3.1-flash-live-preview,
        //     3.5-live-translate-preview. All four reject TEXT; all four accept AUDIO.
        // The transcript we actually want is the USER's speech, which the Live API returns
        // via inputAudioTranscription. The model's own AUDIO response is generated and
        // discarded (there is no "no response" modality).
        // Model: the "-latest" alias, so a dated preview being retired can't break us again.
        let setup: [String: Any] = [
            "setup": [
                "model": "models/gemini-2.5-flash-native-audio-latest",
                "generationConfig": [
                    "responseModalities": ["AUDIO"]
                ],
                "inputAudioTranscription": [:],
                "systemInstruction": [
                    "parts": [["text": systemPrompt]]
                ],
                "realtimeInputConfig": [
                    "automaticActivityDetection": [
                        "endOfSpeechSensitivity": "END_SENSITIVITY_HIGH",
                        "silenceDurationMs": 500
                    ]
                ]
            ]
        ]

        let setupData = try JSONSerialization.data(withJSONObject: setup)
        let setupStr = String(data: setupData, encoding: .utf8)!

        logToFile("Gemini Live: connecting...")
        try await webSocket?.send(.string(setupStr))

        // Wait for setupComplete response
        let response = try await webSocket?.receive()
        if case .string(let text) = response {
            logToFile("Gemini Live: setup response received (\(text.count) chars)")
            if text.contains("setupComplete") {
                isSetupDone = true
                logToFile("Gemini Live: connected and ready")
            } else {
                logToFile("Gemini Live: unexpected setup response: \(text.prefix(300))")
                throw GeminiError.invalidResponse
            }
        }

        // Start listening for responses
        listenForMessages()
    }

    var connected: Bool { isSetupDone && webSocket != nil }

    // MARK: - Send Audio

    /// Send raw PCM audio (Float32 16kHz mono) to Gemini Live.
    /// Call this for every audio buffer — Gemini handles VAD.
    func sendAudio(_ samples: [Float]) {
        guard isSetupDone, let ws = webSocket else { return }

        // Convert Float32 → 16-bit PCM bytes
        var pcmData = Data(capacity: samples.count * 2)
        for sample in samples {
            let clamped = max(-1.0, min(1.0, sample))
            let int16 = Int16(clamped * 32767.0)
            withUnsafeBytes(of: int16.littleEndian) { pcmData.append(contentsOf: $0) }
        }

        let base64 = pcmData.base64EncodedString()

        let message: [String: Any] = [
            "realtimeInput": [
                "mediaChunks": [[
                    "mimeType": "audio/pcm;rate=16000",
                    "data": base64
                ]]
            ]
        ]

        guard let data = try? JSONSerialization.data(withJSONObject: message),
              let str = String(data: data, encoding: .utf8) else { return }

        ws.send(.string(str)) { error in
            if let error {
                logToFile("Gemini Live send error: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Receive

    private func listenForMessages() {
        webSocket?.receive { [weak self] result in
            guard let self else { return }

            switch result {
            case .success(let message):
                self.handleMessage(message)
                self.listenForMessages() // keep listening

            case .failure(let error):
                logToFile("Gemini Live receive error: \(error.localizedDescription)")
                self.isSetupDone = false
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        guard case .string(let text) = message,
              let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }

        guard let serverContent = json["serverContent"] as? [String: Any] else { return }

        // The user's speech comes back as inputTranscription (streamed incrementally while
        // they talk), NOT as modelTurn — modelTurn now carries the model's own AUDIO reply,
        // which we deliberately ignore. See the setup frame for why AUDIO is mandatory.
        if let inputTranscription = serverContent["inputTranscription"] as? [String: Any],
           let partText = inputTranscription["text"] as? String, !partText.isEmpty {
            turnBuffer += partText
            // Surface the partial immediately — text can start appearing at the
            // cursor while the user is still mid-sentence.
            onPartial?(turnBuffer)
        }

        // Turn complete — emit accumulated text
        if let turnComplete = serverContent["turnComplete"] as? Bool, turnComplete {
            let finalText = turnBuffer.trimmingCharacters(in: .whitespacesAndNewlines)
            turnBuffer = ""

            if !finalText.isEmpty {
                logToFile("Gemini Live turn: \"\(finalText.prefix(100))\"")
                onTranscription?(finalText)
            }
        }
    }

    // MARK: - Disconnect

    func disconnect() {
        webSocket?.cancel(with: .goingAway, reason: nil)
        webSocket = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil
        isSetupDone = false
        turnBuffer = ""
        logToFile("Gemini Live: disconnected")
    }

    // MARK: - URLSessionWebSocketDelegate

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        logToFile("Gemini Live: WebSocket closed (code=\(closeCode.rawValue))")
        isSetupDone = false
    }
}
