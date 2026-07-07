import SwiftUI

/// 3-state SwiftUI flow for email-OTP sign-in: email → code → signed-in.
/// Caller presents this in a sheet (Settings → Account tab uses it).
struct SignInView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var code = ""
    @State private var step: SignInStep = .email
    @State private var isWorking = false
    @State private var errorMessage: String?
    @State private var closeIsHovering = false

    /// Brand neon cyan #18D1E0 (Rule 58)
    private static let brandCyan = Color(red: 0.094, green: 0.820, blue: 0.878)

    enum SignInStep {
        case email      // collect email
        case code       // collect 6-digit OTP
        case signedIn   // confirmation
    }

    var body: some View {
        ZStack(alignment: .topTrailing) {
            VStack(spacing: 14) {
                switch step {
                case .email: emailStep
                case .code: codeStep
                case .signedIn: signedInStep
                }
            }
            .frame(width: 380)
            .padding(20)

            // Close button — visible in all 3 states. SignInView is presented as a SwiftUI
            // .sheet from SettingsView's AccountTab, so dismiss() is the right close path
            // (per dispatch: "If it's a SwiftUI `.sheet`, use `dismiss` env action").
            Button { dismiss() } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(closeIsHovering ? Self.brandCyan : Color(white: 0.6))
            }
            .buttonStyle(.plain)
            .padding(12)
            .help("Close")
            .onHover { hovering in
                closeIsHovering = hovering
            }
        }
    }

    // MARK: - Step 1: Email entry

    private var emailStep: some View {
        VStack(spacing: 12) {
            Image(systemName: "envelope.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(Self.brandCyan)

            Text("Sign in to SudoVoice")
                .font(.title3.bold())

            Text("We'll email you a 6-digit code. No password needed.")
                .multilineTextAlignment(.center)
                .font(.callout)
                .foregroundStyle(.secondary)

            TextField("you@example.com", text: $email)
                .textFieldStyle(.roundedBorder)
                .textContentType(.emailAddress)
                .disabled(isWorking)
                .padding(.top, 4)

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Button(isWorking ? "Sending..." : "Send code") {
                sendCode()
            }
            .buttonStyle(.borderedProminent)
            .disabled(email.isEmpty || isWorking)
            .frame(maxWidth: .infinity)

            Text("Sync your transcripts and license across all your devices.")
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
                .padding(.top, 4)
        }
    }

    // MARK: - Step 2: OTP entry

    private var codeStep: some View {
        VStack(spacing: 12) {
            Image(systemName: "key.fill")
                .font(.system(size: 48))
                .foregroundStyle(Self.brandCyan)

            Text("Check your email")
                .font(.title3.bold())

            Text("We sent a code to \(email). Paste it below.")
                .multilineTextAlignment(.center)
                .font(.callout)
                .foregroundStyle(.secondary)

            TextField("123456", text: $code)
                .textFieldStyle(.roundedBorder)
                .font(.system(.body, design: .monospaced))
                .disabled(isWorking)
                .padding(.top, 4)

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Button(isWorking ? "Verifying..." : "Verify") {
                verifyCode()
            }
            .buttonStyle(.borderedProminent)
            .disabled(code.count < 6 || isWorking)
            .frame(maxWidth: .infinity)

            HStack {
                Button("Resend code") { sendCode() }
                    .buttonStyle(.borderless)
                    .font(.caption)
                    .disabled(isWorking)
                Spacer()
                Button("Back") {
                    code = ""
                    errorMessage = nil
                    step = .email
                }
                .buttonStyle(.borderless)
                .font(.caption)
            }
        }
    }

    // MARK: - Step 3: Signed-in confirmation

    private var signedInStep: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 48))
                .foregroundStyle(Self.brandCyan)

            Text("Signed in")
                .font(.title3.bold())

            Text(email)
                .font(.callout)
                .foregroundStyle(.secondary)

            Text("Your transcripts and license now sync across all your devices.")
                .multilineTextAlignment(.center)
                .font(.caption)
                .foregroundStyle(.secondary)

            Button("Sign out") {
                signOut()
            }
            .buttonStyle(.bordered)
            .frame(maxWidth: .infinity)

            Button("Done") { dismiss() }
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Actions

    private func sendCode() {
        errorMessage = nil
        isWorking = true
        Task {
            let ok = await SupabaseService.shared.sendSignInCode(email: email)
            await MainActor.run {
                isWorking = false
                if ok {
                    step = .code
                } else {
                    errorMessage = "Failed to send code. Check your email and try again."
                }
            }
        }
    }

    private func verifyCode() {
        errorMessage = nil
        isWorking = true
        Task {
            let user = await SupabaseService.shared.verifySignInCode(email: email, code: code)
            await MainActor.run {
                isWorking = false
                if user != nil {
                    step = .signedIn
                } else {
                    errorMessage = "Invalid code. Try again or resend."
                }
            }
        }
    }

    private func signOut() {
        Task {
            await SupabaseService.shared.signOut()
            await MainActor.run {
                step = .email
                email = ""
                code = ""
                errorMessage = nil
            }
        }
    }
}
