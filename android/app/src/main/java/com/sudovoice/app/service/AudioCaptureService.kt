package com.sudovoice.app.service

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import kotlin.math.sqrt

/**
 * Audio capture with smart VAD (Voice Activity Detection).
 * Port of macOS AudioCaptureService.swift logic.
 *
 * Records 16kHz mono PCM (Whisper's native format — no conversion needed on Android).
 * Uses RMS-based voice detection with pause-based chunking.
 */
class AudioCaptureService {

    companion object {
        private const val TAG = "AudioCapture"
        const val SAMPLE_RATE = 16000
        private const val CHANNEL = AudioFormat.CHANNEL_IN_MONO
        private const val ENCODING = AudioFormat.ENCODING_PCM_FLOAT
    }

    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var recordingThread: Thread? = null

    // VAD parameters (mirrors macOS values)
    var silenceThreshold = 0.04f        // RMS energy threshold for voice
    var silencePauseThreshold = 0.3f    // 300ms pause = end of thought
    var minChunkDuration = 0.5f         // Minimum 0.5s before emit
    var maxChunkDuration = 15.0f        // Force-emit at 15s

    /** Start recording with VAD chunking */
    fun startRecording(
        chunkDuration: Float = 2.0f,
        silenceThreshold: Float = 0.04f,
        onChunkReady: (FloatArray) -> Unit
    ) {
        this.silenceThreshold = silenceThreshold

        val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL, ENCODING)
            .coerceAtLeast(SAMPLE_RATE * 2 * 4) // At least 2 seconds

        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            SAMPLE_RATE,
            CHANNEL,
            ENCODING,
            bufferSize
        )

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord failed to initialize")
            return
        }

        isRecording = true
        audioRecord?.startRecording()

        recordingThread = Thread {
            val buffer = FloatArray(SAMPLE_RATE / 10) // 100ms chunks
            val accumulated = mutableListOf<Float>()
            var voiceDetected = false
            var silenceSamples = 0
            val silenceSamplesThreshold = (silencePauseThreshold * SAMPLE_RATE).toInt()
            val minSamples = (minChunkDuration * SAMPLE_RATE).toInt()
            val maxSamples = (maxChunkDuration * SAMPLE_RATE).toInt()

            while (isRecording) {
                val read = audioRecord?.read(buffer, 0, buffer.size, AudioRecord.READ_BLOCKING) ?: 0
                if (read <= 0) continue

                val samples = buffer.copyOfRange(0, read)
                accumulated.addAll(samples.toList())

                // Calculate RMS energy
                val rms = calculateRMS(samples)

                if (rms > this.silenceThreshold) {
                    voiceDetected = true
                    silenceSamples = 0
                } else if (voiceDetected) {
                    silenceSamples += read
                }

                // Emit chunk conditions (same as macOS):
                // 1. User paused (silence >= 300ms after voice) AND >= 0.5s accumulated
                // 2. OR max duration reached (15s safety)
                val shouldEmit = (voiceDetected && silenceSamples >= silenceSamplesThreshold
                        && accumulated.size >= minSamples)
                        || accumulated.size >= maxSamples

                if (shouldEmit && accumulated.isNotEmpty()) {
                    val chunk = accumulated.toFloatArray()
                    accumulated.clear()
                    voiceDetected = false
                    silenceSamples = 0

                    Log.d(TAG, "Chunk ready: ${chunk.size} samples (${chunk.size / SAMPLE_RATE.toFloat()}s)")
                    onChunkReady(chunk)
                }
            }

            // Emit remaining samples when stopping
            if (accumulated.isNotEmpty()) {
                onChunkReady(accumulated.toFloatArray())
            }
        }.also { it.start() }

        Log.i(TAG, "Recording started")
    }

    /** Stop recording and return remaining samples */
    fun stopRecording() {
        isRecording = false
        recordingThread?.join(2000)
        recordingThread = null

        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        Log.i(TAG, "Recording stopped")
    }

    /** Calculate RMS energy of audio samples */
    private fun calculateRMS(samples: FloatArray): Float {
        if (samples.isEmpty()) return 0f
        var sum = 0.0
        for (s in samples) {
            sum += s * s
        }
        return sqrt(sum / samples.size).toFloat()
    }
}
