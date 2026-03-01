package com.indianwhisper.app.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class SettingsActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val prefs = getSharedPreferences("indianwhisper", MODE_PRIVATE)

        setContent {
            IndianWhisperTheme {
                SettingsScreen(
                    groqKey = prefs.getString("groqApiKey", "") ?: "",
                    openRouterKey = prefs.getString("openRouterApiKey", "") ?: "",
                    llmCleanupEnabled = prefs.getBoolean("llmCleanupEnabled", true),
                    hindiMode = prefs.getBoolean("hindiMode", false),
                    licenseKey = prefs.getString("licenseKey", "") ?: "",
                    onSave = { groq, openRouter, cleanup, hindi, license ->
                        prefs.edit().apply {
                            putString("groqApiKey", groq)
                            putString("openRouterApiKey", openRouter)
                            putBoolean("llmCleanupEnabled", cleanup)
                            putBoolean("hindiMode", hindi)
                            putString("licenseKey", license)
                            apply()
                        }
                        finish()
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    groqKey: String,
    openRouterKey: String,
    llmCleanupEnabled: Boolean,
    hindiMode: Boolean,
    licenseKey: String,
    onSave: (String, String, Boolean, Boolean, String) -> Unit
) {
    var groq by remember { mutableStateOf(groqKey) }
    var openRouter by remember { mutableStateOf(openRouterKey) }
    var cleanup by remember { mutableStateOf(llmCleanupEnabled) }
    var hindi by remember { mutableStateOf(hindiMode) }
    var license by remember { mutableStateOf(licenseKey) }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Settings", fontWeight = FontWeight.Bold) })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Language
            Text("Language", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Hindi Mode (Hindi/Hinglish)")
                Switch(checked = hindi, onCheckedChange = { hindi = it })
            }

            Divider()

            // LLM Cleanup
            Text("LLM Cleanup", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Enable text cleanup")
                Switch(checked = cleanup, onCheckedChange = { cleanup = it })
            }

            OutlinedTextField(
                value = groq,
                onValueChange = { groq = it },
                label = { Text("Groq API Key (fastest ~100ms)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = openRouter,
                onValueChange = { openRouter = it },
                label = { Text("OpenRouter API Key (fallback)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Text(
                "Groq preferred, OpenRouter fallback. Removes fillers, fixes grammar.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            )

            Divider()

            // License
            Text("License", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            OutlinedTextField(
                value = license,
                onValueChange = { license = it },
                label = { Text("License Key (optional)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = { onSave(groq, openRouter, cleanup, hindi, license) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Save Settings")
            }
        }
    }
}
