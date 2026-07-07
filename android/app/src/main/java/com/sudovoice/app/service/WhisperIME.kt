package com.sudovoice.app.service

import android.inputmethodservice.InputMethodService
import android.util.Log
import android.view.View
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import kotlinx.coroutines.*

/**
 * WhisperIME — System-wide voice keyboard using InputMethodService.
 * KILLER FEATURE: Voice typing in ANY Android app (WhatsApp, Chrome, Notes, etc.)
 *
 * Reference: WhisperInput (alex-vt/WhisperInput) for InputMethodService pattern.
 *
 * Flow:
 * 1. User enables SudoVoice in Settings → Languages & Input
 * 2. Keyboard shows mic button
 * 3. Tap mic → record → release/pause → transcribe → text inserts at cursor
 */
class WhisperIME : InputMethodService() {

    companion object {
        private const val TAG = "WhisperIME"
    }

    private var whisperService: WhisperService? = null
    private var audioCapture: AudioCaptureService? = null
    private var llmCleanup: LLMCleanupService? = null
    private var isListening = false
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // UI Elements
    private var statusText: TextView? = null
    private var micButton: ImageButton? = null

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "WhisperIME created")

        whisperService = WhisperService(applicationContext)
        audioCapture = AudioCaptureService()
        llmCleanup = LLMCleanupService()

        // Load model in background
        scope.launch {
            try {
                whisperService?.loadModel(
                    com.sudovoice.app.model.WhisperModelSize.TINY,
                    language = "en"
                )
                Log.i(TAG, "IME model loaded")
            } catch (e: Exception) {
                Log.e(TAG, "IME model load failed: ${e.message}")
            }
        }
    }

    override fun onCreateInputView(): View {
        // Simple keyboard view with mic button
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(16, 8, 16, 8)
            setBackgroundColor(0xFF0A1220.toInt())
        }

        statusText = TextView(this).apply {
            text = "Tap mic to speak"
            setTextColor(0xFF8FA3BF.toInt())
            textSize = 14f
            setPadding(8, 4, 8, 4)
        }
        layout.addView(statusText)

        val buttonRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 8, 0, 8)
        }

        micButton = ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_btn_speak_now)
            setBackgroundColor(0xFF14213A.toInt())
            setPadding(32, 32, 32, 32)
            setOnClickListener { toggleListening() }
        }
        buttonRow.addView(micButton)

        layout.addView(buttonRow)
        return layout
    }

    private fun toggleListening() {
        if (isListening) {
            stopListening()
        } else {
            startListening()
        }
    }

    private fun startListening() {
        isListening = true
        statusText?.text = "Listening..."
        micButton?.setBackgroundColor(0xFF00C853.toInt())

        audioCapture?.startRecording(
            chunkDuration = 2.0f,
            silenceThreshold = 0.04f
        ) { chunk ->
            scope.launch {
                processChunk(chunk)
            }
        }
    }

    private fun stopListening() {
        isListening = false
        audioCapture?.stopRecording()
        statusText?.text = "Tap mic to speak"
        micButton?.setBackgroundColor(0xFF14213A.toInt())
    }

    private suspend fun processChunk(samples: FloatArray) {
        withContext(Dispatchers.Main) {
            statusText?.text = "Transcribing..."
        }

        val rawText = whisperService?.transcribe(samples) ?: ""
        if (rawText.isBlank()) {
            withContext(Dispatchers.Main) {
                statusText?.text = if (isListening) "Listening..." else "Tap mic to speak"
            }
            return
        }

        // Skip hallucinations
        val hallucinations = setOf(
            ".", "..", "...", "thank you.", "thanks for watching!",
            "bye.", "you", "thanks.", "thank you", "mm.", "hmm.",
            "mm", "hmm", "uh", "um", "ah", "oh"
        )
        if (rawText.trim().lowercase() in hallucinations) return

        // LLM cleanup (if keys available)
        val prefs = getSharedPreferences("sudovoice", MODE_PRIVATE)
        val groqKey = prefs.getString("groqApiKey", "") ?: ""
        val openRouterKey = prefs.getString("openRouterApiKey", "") ?: ""
        val cleanupEnabled = prefs.getBoolean("llmCleanupEnabled", true)

        val outputText = if (cleanupEnabled && (groqKey.isNotEmpty() || openRouterKey.isNotEmpty())) {
            val cleaned = llmCleanup?.cleanWithFailover(rawText.trim(), groqKey, openRouterKey) ?: rawText.trim()
            if (cleaned.isEmpty()) return // [SKIP]
            cleaned
        } else {
            rawText.trim()
        }

        // Insert text at cursor
        withContext(Dispatchers.Main) {
            currentInputConnection?.commitText("$outputText ", 1)
            statusText?.text = if (isListening) "Listening..." else "Tap mic to speak"
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
        audioCapture?.stopRecording()
        whisperService?.release()
        Log.i(TAG, "WhisperIME destroyed")
    }
}
