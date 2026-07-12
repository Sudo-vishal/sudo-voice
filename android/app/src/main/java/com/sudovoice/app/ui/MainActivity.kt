package com.sudovoice.app.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.sudovoice.app.model.AppState
import com.sudovoice.app.model.FreeTierLimits
import com.sudovoice.app.service.AudioCaptureService
import com.sudovoice.app.service.LLMCleanupService
import com.sudovoice.app.service.WhisperService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {

    private var whisperService: WhisperService? = null
    private var audioCapture: AudioCaptureService? = null
    private var llmCleanup: LLMCleanupService? = null

    private val micPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            Toast.makeText(this, "Microphone permission granted", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        whisperService = WhisperService(applicationContext)
        audioCapture = AudioCaptureService()
        llmCleanup = LLMCleanupService()

        // Request mic permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED
        ) {
            micPermission.launch(Manifest.permission.RECORD_AUDIO)
        }

        setContent {
            SudoVoiceTheme {
                MainScreen(
                    whisperService = whisperService!!,
                    audioCapture = audioCapture!!,
                    llmCleanup = llmCleanup!!,
                    onOpenSettings = {
                        startActivity(Intent(this, SettingsActivity::class.java))
                    },
                    onEnableIME = {
                        startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
                    }
                )
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        audioCapture?.stopRecording()
        whisperService?.release()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    whisperService: WhisperService,
    audioCapture: AudioCaptureService,
    llmCleanup: LLMCleanupService,
    onOpenSettings: () -> Unit,
    onEnableIME: () -> Unit
) {
    val isRecording by AppState.isRecording.collectAsState()
    val isProcessing by AppState.isProcessing.collectAsState()
    val isModelLoaded by AppState.isModelLoaded.collectAsState()
    val lastTranscription by AppState.lastTranscription.collectAsState()
    val minutesUsed by AppState.minutesTranscribedToday.collectAsState()
    val isPro by AppState.isPro.collectAsState()
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("SudoVoice", fontWeight = FontWeight.Bold)
                        Text(
                            "by AiwithVishal",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                },
                actions = {
                    if (!isPro) {
                        Text(
                            "${String.format("%.0f", FreeTierLimits.MINUTES_PER_DAY - minutesUsed)}m left",
                            fontSize = 12.sp,
                            modifier = Modifier.padding(end = 8.dp)
                        )
                    }
                    IconButton(onClick = onOpenSettings) {
                        Text("Settings") // Replace with icon
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Status text
            Text(
                text = when {
                    !isModelLoaded -> "Loading model..."
                    isProcessing -> "Transcribing..."
                    isRecording -> "Listening..."
                    AppState.isFreeTierExhausted -> "Daily limit reached"
                    else -> "Tap to speak"
                },
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Big record button
            Button(
                onClick = {
                    if (isRecording) {
                        audioCapture.stopRecording()
                        AppState.setRecording(false)
                    } else {
                        AppState.setRecording(true)
                        audioCapture.startRecording { chunk ->
                            scope.launch {
                                processChunk(chunk, whisperService, llmCleanup)
                            }
                        }
                    }
                },
                modifier = Modifier.size(120.dp),
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isRecording) Color(0xFFE53935) else Color(0xFF00E676)
                ),
                enabled = isModelLoaded && !AppState.isFreeTierExhausted
            ) {
                Text(
                    if (isRecording) "STOP" else "REC",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isRecording) Color.White else Color(0xFF03140B)
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Last transcription
            if (lastTranscription.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Text(
                        text = lastTranscription,
                        modifier = Modifier.padding(16.dp),
                        fontSize = 16.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Enable voice keyboard hint
            OutlinedButton(onClick = onEnableIME) {
                Text("Enable Voice Keyboard (IME)")
            }

            if (!isPro) {
                Spacer(modifier = Modifier.height(8.dp))
                // Free tier usage bar
                LinearProgressIndicator(
                    progress = (minutesUsed / FreeTierLimits.MINUTES_PER_DAY).toFloat().coerceIn(0f, 1f),
                    modifier = Modifier.fillMaxWidth(),
                    color = if (AppState.isFreeTierExhausted) Color.Red else MaterialTheme.colorScheme.primary
                )
                Text(
                    "${String.format("%.1f", minutesUsed)} / ${FreeTierLimits.MINUTES_PER_DAY.toInt()} min today",
                    fontSize = 12.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

/** Process audio chunk through Whisper + LLM cleanup pipeline */
private suspend fun processChunk(
    samples: FloatArray,
    whisperService: WhisperService,
    llmCleanup: LLMCleanupService
) {
    AppState.setProcessing(true)

    // Track usage
    val seconds = samples.size / 16000.0
    AppState.setMinutesTranscribedToday(
        AppState.minutesTranscribedToday.value + seconds / 60.0
    )

    val rawText = withContext(Dispatchers.IO) {
        whisperService.transcribe(samples)
    }

    if (rawText.isBlank()) {
        AppState.setProcessing(false)
        return
    }

    // Skip hallucinations
    val hallucinations = setOf(
        ".", "..", "...", "thank you.", "thanks for watching!",
        "bye.", "you", "thanks.", "thank you", "mm.", "hmm."
    )
    if (rawText.trim().lowercase() in hallucinations) {
        AppState.setProcessing(false)
        return
    }

    // TODO: LLM cleanup (needs API keys from SharedPreferences)
    val outputText = rawText.trim()

    AppState.setLastTranscription(outputText)
    AppState.setProcessing(false)
}

@Composable
fun SudoVoiceTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Color(0xFF00E676),
            secondary = Color(0xFF4FC3F7),
            surface = Color(0xFF0A1220),
            background = Color(0xFF04070F)
        ),
        content = content
    )
}
