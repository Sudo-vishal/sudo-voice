package com.sudovoice.app.service

import android.content.Context
import android.util.Log
import com.sudovoice.app.model.WhisperModelSize
import com.k2fsa.sherpa.onnx.*
import java.io.File

/**
 * Sherpa-ONNX wrapper for Whisper model loading + transcription.
 * Equivalent to macOS TranscriptionService.swift.
 *
 * Uses sherpa-onnx Kotlin API:
 * - OfflineRecognizer for batch transcription
 * - Supports whisper-tiny, whisper-base, whisper-small
 * - Models stored in app internal storage
 */
class WhisperService(private val context: Context) {

    companion object {
        private const val TAG = "WhisperService"
    }

    private var recognizer: OfflineRecognizer? = null
    private var currentModel: WhisperModelSize? = null

    /** Load a Whisper model. Downloads if not cached. */
    suspend fun loadModel(
        model: WhisperModelSize,
        language: String = "en",
        onProgress: (Float) -> Unit = {}
    ) {
        Log.i(TAG, "Loading model: ${model.modelName}")

        val modelDir = File(context.filesDir, "models/${model.modelName}")

        // Check if model exists locally
        if (!modelDir.exists() || !File(modelDir, "model.onnx").exists()) {
            Log.i(TAG, "Model not found locally — downloading ${model.modelName}")
            downloadModel(model, modelDir, onProgress)
        }

        // Create Sherpa-ONNX recognizer config
        val whisperConfig = OfflineWhisperModelConfig(
            encoder = File(modelDir, "encoder.onnx").absolutePath,
            decoder = File(modelDir, "decoder.onnx").absolutePath,
            language = language,
            task = "transcribe"
        )

        val modelConfig = OfflineModelConfig(
            whisper = whisperConfig,
            tokens = File(modelDir, "tokens.txt").absolutePath,
            numThreads = 4,
            debug = false
        )

        val config = OfflineRecognizerConfig(
            modelConfig = modelConfig,
            decodingMethod = "greedy_search"
        )

        // Named arg required: first positional param is assetManager (for APK-bundled models)
        recognizer = OfflineRecognizer(config = config)
        currentModel = model
        Log.i(TAG, "Model loaded: ${model.modelName}")
    }

    /** Transcribe audio samples (16kHz mono Float) to text */
    fun transcribe(samples: FloatArray, sampleRate: Int = 16000): String {
        val rec = recognizer ?: run {
            Log.w(TAG, "Recognizer not loaded")
            return ""
        }

        val stream = rec.createStream()
        stream.acceptWaveform(samples, sampleRate)
        rec.decode(stream)

        val result = rec.getResult(stream)
        return result.text.trim()
    }

    /** Check if a model is downloaded */
    fun isModelDownloaded(model: WhisperModelSize): Boolean {
        val modelDir = File(context.filesDir, "models/${model.modelName}")
        return modelDir.exists() && File(modelDir, "encoder.onnx").exists()
    }

    /** Download model files from HuggingFace/sherpa-onnx releases */
    private suspend fun downloadModel(
        model: WhisperModelSize,
        targetDir: File,
        onProgress: (Float) -> Unit
    ) {
        targetDir.mkdirs()

        // Sherpa-ONNX model URLs (from k2-fsa releases)
        val baseUrl = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models"
        val modelName = "sherpa-onnx-whisper-${model.modelName}"

        val files = listOf(
            "${modelName}-encoder.onnx" to "encoder.onnx",
            "${modelName}-decoder.onnx" to "decoder.onnx",
            "${modelName}-tokens.txt" to "tokens.txt"
        )

        var downloaded = 0
        for ((remoteName, localName) in files) {
            val url = "$baseUrl/$remoteName"
            val targetFile = File(targetDir, localName)

            Log.i(TAG, "Downloading: $url")
            // TODO: Implement actual HTTP download with progress
            // For now, placeholder — will use OkHttp in production
            downloaded++
            onProgress(downloaded.toFloat() / files.size)
        }

        Log.i(TAG, "Model download complete: ${model.modelName}")
    }

    fun release() {
        recognizer = null
        currentModel = null
    }
}
