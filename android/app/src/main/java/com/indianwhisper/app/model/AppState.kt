package com.indianwhisper.app.model

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Central app state using Kotlin StateFlow (equivalent to Swift @Observable).
 * Mirrors macOS AppState.swift structure.
 */
object AppState {

    // Recording
    private val _isRecording = MutableStateFlow(false)
    val isRecording: StateFlow<Boolean> = _isRecording.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing: StateFlow<Boolean> = _isProcessing.asStateFlow()

    // Model
    private val _isModelLoaded = MutableStateFlow(false)
    val isModelLoaded: StateFlow<Boolean> = _isModelLoaded.asStateFlow()

    private val _isModelDownloading = MutableStateFlow(false)
    val isModelDownloading: StateFlow<Boolean> = _isModelDownloading.asStateFlow()

    private val _modelDownloadProgress = MutableStateFlow(0f)
    val modelDownloadProgress: StateFlow<Float> = _modelDownloadProgress.asStateFlow()

    // Transcription
    private val _lastTranscription = MutableStateFlow("")
    val lastTranscription: StateFlow<String> = _lastTranscription.asStateFlow()

    // Free tier
    private val _minutesTranscribedToday = MutableStateFlow(0.0)
    val minutesTranscribedToday: StateFlow<Double> = _minutesTranscribedToday.asStateFlow()

    private val _isPro = MutableStateFlow(false)
    val isPro: StateFlow<Boolean> = _isPro.asStateFlow()

    // Setters
    fun setRecording(value: Boolean) { _isRecording.value = value }
    fun setProcessing(value: Boolean) { _isProcessing.value = value }
    fun setModelLoaded(value: Boolean) { _isModelLoaded.value = value }
    fun setModelDownloading(value: Boolean) { _isModelDownloading.value = value }
    fun setModelDownloadProgress(value: Float) { _modelDownloadProgress.value = value }
    fun setLastTranscription(value: String) { _lastTranscription.value = value }
    fun setMinutesTranscribedToday(value: Double) { _minutesTranscribedToday.value = value }
    fun setPro(value: Boolean) { _isPro.value = value }

    val isFreeTierExhausted: Boolean
        get() = !_isPro.value && _minutesTranscribedToday.value >= FreeTierLimits.MINUTES_PER_DAY
}

/** Free tier constants — mirrors macOS FreeTierLimits */
object FreeTierLimits {
    const val MINUTES_PER_DAY = 30.0
    const val LLM_CLEANUPS_PER_DAY = 20
    const val MAX_DEVICES = 1
}

/** Whisper model sizes — mirrors macOS WhisperModelSize */
enum class WhisperModelSize(
    val modelName: String,
    val displayName: String,
    val sizeMB: Int,
    val isFree: Boolean
) {
    TINY("tiny", "Tiny (~75 MB)", 75, true),
    BASE("base", "Base (~140 MB)", 140, true),
    SMALL("small", "Small (~460 MB)", 460, false);
    // Large models not included on Android — too heavy for mobile
}
