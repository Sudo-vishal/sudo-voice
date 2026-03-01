package com.indianwhisper.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class IndianWhisperApp : Application() {

    companion object {
        const val CHANNEL_RECORDING = "recording_channel"
        const val CHANNEL_STATUS = "status_channel"
        lateinit var instance: IndianWhisperApp
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java)

            val recordingChannel = NotificationChannel(
                CHANNEL_RECORDING,
                "Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when voice recording is active"
                setShowBadge(false)
            }

            val statusChannel = NotificationChannel(
                CHANNEL_STATUS,
                "Status",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Transcription status updates"
            }

            manager.createNotificationChannels(listOf(recordingChannel, statusChannel))
        }
    }
}
