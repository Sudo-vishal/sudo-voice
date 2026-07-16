import Foundation

final class GroqTranscriptionService {
    private struct Response: Decodable {
        let text: String
    }

    func transcribe(
        audioSamples: [Float],
        apiKey: String,
        language: String?
    ) async throws -> String {
        guard !apiKey.isEmpty else { throw GroqTranscriptionError.noAPIKey }

        let boundary = "IndianWhisper-\(UUID().uuidString)"
        var body = Data()
        appendField("model", value: "whisper-large-v3-turbo", boundary: boundary, to: &body)
        if let language {
            appendField("language", value: language, boundary: boundary, to: &body)
        }
        appendFile(
            createWAV(from: audioSamples),
            filename: "dictation.wav",
            boundary: boundary,
            to: &body
        )
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        var request = URLRequest(
            url: URL(string: "https://api.groq.com/openai/v1/audio/transcriptions")!
        )
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.httpBody = body
        request.timeoutInterval = 15

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 15
        configuration.timeoutIntervalForResource = 15
        let (data, response) = try await URLSession(configuration: configuration).data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw GroqTranscriptionError.invalidResponse
        }
        guard http.statusCode == 200 else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw GroqTranscriptionError.apiError(http.statusCode, message)
        }

        return try JSONDecoder().decode(Response.self, from: data).text
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func appendField(_ name: String, value: String, boundary: String, to body: inout Data) {
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(value)\r\n".data(using: .utf8)!)
    }

    private func appendFile(_ data: Data, filename: String, boundary: String, to body: inout Data) {
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/wav\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n".data(using: .utf8)!)
    }

    /// Convert 16kHz mono Float32 PCM to a standard 16-bit PCM WAV.
    private func createWAV(from samples: [Float]) -> Data {
        let dataSize = samples.count * MemoryLayout<Int16>.size
        var wav = Data(capacity: 44 + dataSize)

        wav.append(contentsOf: [0x52, 0x49, 0x46, 0x46])
        append(UInt32(36 + dataSize), to: &wav)
        wav.append(contentsOf: [0x57, 0x41, 0x56, 0x45])
        wav.append(contentsOf: [0x66, 0x6D, 0x74, 0x20])
        append(UInt32(16), to: &wav)
        append(UInt16(1), to: &wav)
        append(UInt16(1), to: &wav)
        append(UInt32(16000), to: &wav)
        append(UInt32(32000), to: &wav)
        append(UInt16(2), to: &wav)
        append(UInt16(16), to: &wav)
        wav.append(contentsOf: [0x64, 0x61, 0x74, 0x61])
        append(UInt32(dataSize), to: &wav)

        for sample in samples {
            append(Int16(max(-1, min(1, sample)) * 32767), to: &wav)
        }
        return wav
    }

    private func append<T: FixedWidthInteger>(_ value: T, to data: inout Data) {
        var littleEndian = value.littleEndian
        withUnsafeBytes(of: &littleEndian) { data.append(contentsOf: $0) }
    }
}

enum GroqTranscriptionError: LocalizedError {
    case noAPIKey
    case invalidResponse
    case apiError(Int, String)

    var errorDescription: String? {
        switch self {
        case .noAPIKey:
            return "Add a Groq API key in Settings."
        case .invalidResponse:
            return "Groq returned an invalid response."
        case .apiError(let status, _):
            return "Groq transcription failed (HTTP \(status))."
        }
    }
}
