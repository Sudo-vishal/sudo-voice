import SwiftUI

/// First-run onboarding: Microphone → Accessibility → Model Pick → License/Start Free
struct OnboardingView: View {
    @Environment(AppState.self) private var appState
    @State private var currentStep = 0

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("IndianWhisper")
                    .font(.title2.bold())
                Text("by AiwithDhruv")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 20)

            // Step indicator
            HStack(spacing: 8) {
                ForEach(0..<4, id: \.self) { i in
                    Circle()
                        .fill(i <= currentStep ? Color.accentColor : Color.gray.opacity(0.3))
                        .frame(width: 8, height: 8)
                }
            }
            .padding(.top, 8)

            Divider().padding(.vertical, 12)

            // Content
            Group {
                switch currentStep {
                case 0: MicrophoneStep(onNext: { currentStep = 1 })
                case 1: AccessibilityStep(onNext: { currentStep = 2 })
                case 2: ModelStep(onNext: { currentStep = 3 })
                case 3: LicenseStep(onComplete: completeOnboarding)
                default: EmptyView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(.horizontal, 24)
        }
        .frame(width: 420, height: 360)
    }

    private func completeOnboarding() {
        appState.hasCompletedOnboarding = true
        NSApplication.shared.keyWindow?.close()
    }
}

// MARK: - Step 1: Microphone

private struct MicrophoneStep: View {
    let onNext: () -> Void
    @State private var granted = PermissionService.microphoneStatus() == .granted

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "mic.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.blue)

            Text("Microphone Access")
                .font(.headline)

            Text("IndianWhisper needs microphone access to transcribe your voice. All processing happens locally on your Mac.")
                .multilineTextAlignment(.center)
                .font(.callout)
                .foregroundStyle(.secondary)

            if granted {
                Label("Microphone granted", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } else {
                Button("Grant Microphone Access") {
                    Task {
                        let result = await PermissionService.requestMicrophonePermission()
                        granted = result
                    }
                }
                .buttonStyle(.borderedProminent)
            }

            Spacer()

            HStack {
                Spacer()
                Button("Next") { onNext() }
                    .buttonStyle(.borderedProminent)
                    .disabled(!granted)
            }
        }
        .padding(.bottom, 16)
    }
}

// MARK: - Step 2: Accessibility

private struct AccessibilityStep: View {
    let onNext: () -> Void
    @State private var granted = AutoTypeService.isAccessibilityGranted()

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "hand.raised.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.orange)

            Text("Accessibility Access")
                .font(.headline)

            Text("Required for auto-typing transcribed text at your cursor. Without this, text will be copied to clipboard instead.")
                .multilineTextAlignment(.center)
                .font(.callout)
                .foregroundStyle(.secondary)

            if granted {
                Label("Accessibility granted", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            } else {
                Button("Open Accessibility Settings") {
                    AutoTypeService.promptAccessibilityOnce()
                    // Poll for grant (user has to toggle it manually)
                    Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { timer in
                        if AutoTypeService.isAccessibilityGranted() {
                            granted = true
                            timer.invalidate()
                        }
                    }
                }
                .buttonStyle(.borderedProminent)

                Text("Toggle IndianWhisper in System Settings → Privacy → Accessibility")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            HStack {
                Button("Skip") { onNext() }
                    .buttonStyle(.bordered)
                Spacer()
                Button("Next") { onNext() }
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding(.bottom, 16)
    }
}

// MARK: - Step 3: Model Selection

private struct ModelStep: View {
    @Environment(AppState.self) private var appState
    let onNext: () -> Void

    var body: some View {
        @Bindable var state = appState

        VStack(spacing: 16) {
            Image(systemName: "cpu.fill")
                .font(.system(size: 48))
                .foregroundStyle(.purple)

            Text("Choose Your Model")
                .font(.headline)

            Text("Larger models are more accurate but use more memory. You can change this later in Settings.")
                .multilineTextAlignment(.center)
                .font(.callout)
                .foregroundStyle(.secondary)

            VStack(spacing: 8) {
                ForEach(WhisperModelSize.allCases) { model in
                    HStack {
                        Image(systemName: appState.selectedModel == model ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(appState.selectedModel == model ? .blue : .gray)
                        Text(model.displayName)
                        Spacer()
                        if !model.isFree && !appState.isPro {
                            Text("PRO")
                                .font(.caption2.bold())
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(.yellow.opacity(0.2))
                                .clipShape(Capsule())
                        }
                    }
                    .padding(.vertical, 4)
                    .padding(.horizontal, 8)
                    .background(appState.selectedModel == model ? Color.accentColor.opacity(0.1) : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .contentShape(Rectangle())
                    .onTapGesture {
                        if model.isFree || appState.isPro {
                            appState.selectedModel = model
                        }
                    }
                    .opacity(!model.isFree && !appState.isPro ? 0.5 : 1.0)
                }
            }

            Spacer()

            HStack {
                Spacer()
                Button("Next") { onNext() }
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding(.bottom, 16)
    }
}

// MARK: - Step 4: License

private struct LicenseStep: View {
    @Environment(AppState.self) private var appState
    let onComplete: () -> Void
    @State private var licenseInput = ""
    @State private var activating = false
    @State private var message = ""

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "key.fill")
                .font(.system(size: 48))
                .foregroundStyle(.green)

            Text("Activate Pro (Optional)")
                .font(.headline)

            Text("Enter your license key to unlock all models, unlimited transcription, and more. Or start free with 30 min/day.")
                .multilineTextAlignment(.center)
                .font(.callout)
                .foregroundStyle(.secondary)

            TextField("License key", text: $licenseInput)
                .textFieldStyle(.roundedBorder)
                .font(.system(.body, design: .monospaced))

            if !message.isEmpty {
                Text(message)
                    .font(.caption)
                    .foregroundStyle(appState.isPro ? .green : .red)
            }

            if activating {
                ProgressView()
                    .scaleEffect(0.8)
            }

            // Free tier info
            VStack(alignment: .leading, spacing: 4) {
                Text("Free tier includes:")
                    .font(.caption.bold())
                Text("  30 min/day  ·  Tiny & Base models  ·  20 LLM cleanups/day")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(8)
            .background(.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: 6))

            Spacer()

            HStack {
                Button("Start Free") {
                    onComplete()
                }
                .buttonStyle(.bordered)

                Spacer()

                Button("Activate") {
                    activateKey()
                }
                .buttonStyle(.borderedProminent)
                .disabled(licenseInput.isEmpty || activating)
            }
        }
        .padding(.bottom, 16)
    }

    private func activateKey() {
        activating = true
        message = ""
        Task {
            let result = await appState.licenseService?.activate(licenseInput) ?? (success: false, message: "Service unavailable")
            await MainActor.run {
                activating = false
                if result.0 {
                    appState.licenseKey = licenseInput
                    appState.isPro = true
                    message = "Pro activated!"
                    // Auto-complete after short delay
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                        onComplete()
                    }
                } else {
                    message = result.1
                }
            }
        }
    }
}
