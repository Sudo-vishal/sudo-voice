import AppKit

// MARK: - Pure AppKit Floating Indicator (no SwiftUI = no constraint crashes)

final class FloatingIndicatorWindow: NSWindow {
    init() {
        super.init(
            contentRect: NSRect(x: 0, y: 0, width: 200, height: 36),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )

        isOpaque = false
        backgroundColor = .clear
        level = .floating
        hasShadow = false
        isReleasedWhenClosed = false
        collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
        isMovableByWindowBackground = true
        ignoresMouseEvents = false

        if let screen = NSScreen.main {
            let screenFrame = screen.visibleFrame
            let x = screenFrame.minX + 32
            let y = screenFrame.minY + 60
            setFrameOrigin(NSPoint(x: x, y: y))
        }
    }

    override var canBecomeKey: Bool { true }
    override func mouseDragged(with event: NSEvent) {
        self.performDrag(with: event)
    }
}

// MARK: - Neon Capsule View (pure AppKit + CALayer)

final class NeonCapsuleView: NSView {
    private let label = NSTextField(labelWithString: "")
    private let dotLayer = CALayer()
    private var waveBars: [CALayer] = []
    private let waveBarCount = 5

    private var currentColor: NSColor = SVTheme.nsGreen

    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        setupLayers()
        setupLabel()
        setupWaveBars()
    }

    required init?(coder: NSCoder) { nil }
    override var isFlipped: Bool { false }

    private func setupLayers() {
        guard let layer = self.layer else { return }
        layer.masksToBounds = false

        // SudoVoice terminal chip: deep navy panel, squared corners, hairline border
        layer.backgroundColor = SVTheme.nsPanel.withAlphaComponent(0.96).cgColor
        layer.cornerRadius = 10
        layer.borderWidth = 1.0
        layer.borderColor = SVTheme.nsGreen.withAlphaComponent(0.45).cgColor

        // Soft phosphor glow
        layer.shadowColor = SVTheme.nsGreen.cgColor
        layer.shadowRadius = 10
        layer.shadowOpacity = 0.22
        layer.shadowOffset = .zero

        // Dot
        dotLayer.frame = CGRect(x: 14, y: 14, width: 8, height: 8)
        dotLayer.cornerRadius = 4
        dotLayer.backgroundColor = SVTheme.nsGreen.cgColor
        dotLayer.shadowColor = dotLayer.backgroundColor
        dotLayer.shadowRadius = 5
        dotLayer.shadowOpacity = 0.9
        dotLayer.shadowOffset = .zero
        layer.addSublayer(dotLayer)
    }

    private func setupLabel() {
        label.font = NSFont.monospacedSystemFont(ofSize: 11, weight: .semibold)
        label.textColor = SVTheme.nsGreen
        label.backgroundColor = .clear
        label.isBezeled = false
        label.isEditable = false
        label.isSelectable = false
        label.alignment = .left
        label.frame = CGRect(x: 30, y: 9, width: 110, height: 18)
        addSubview(label)
    }

    private func setupWaveBars() {
        guard let layer = self.layer else { return }
        for i in 0..<waveBarCount {
            let bar = CALayer()
            bar.cornerRadius = 1.5
            bar.backgroundColor = currentColor.cgColor
            // Position bars after text area — will be updated in update()
            let x = CGFloat(140 + i * 5)
            bar.frame = CGRect(x: x, y: 15, width: 2.5, height: 6)
            bar.opacity = 0 // hidden by default
            layer.addSublayer(bar)
            waveBars.append(bar)
        }
    }

    func update(isRecording: Bool, isProcessing: Bool) {
        let color: NSColor
        let text: String

        if isRecording {
            color = SVTheme.nsGreen
            // User-customizable brand name, set in Settings → General. Any user can
            // put their own name; defaults to the sudovoice wordmark.
            let stored = UserDefaults.standard.string(forKey: "listeningLabel") ?? ""
            text = stored.isEmpty ? "sudovoice" : stored
        } else if isProcessing {
            color = SVTheme.nsCyan
            text = "typing…"
        } else {
            color = SVTheme.nsMuted
            text = "$ ready"
        }

        currentColor = color

        CATransaction.begin()
        CATransaction.setDisableActions(true)
        dotLayer.backgroundColor = color.cgColor
        dotLayer.shadowColor = color.cgColor
        layer?.borderColor = color.withAlphaComponent(0.5).cgColor
        layer?.shadowColor = color.cgColor
        CATransaction.commit()

        label.textColor = color
        label.stringValue = text

        // Resize window to fit text + wave bars
        label.sizeToFit()
        let textWidth = label.frame.width
        let waveWidth: CGFloat = isRecording ? 34 : 0  // 5 bars * 5px + padding
        let totalWidth = 30 + textWidth + 10 + waveWidth + 14
        self.frame = NSRect(x: 0, y: 0, width: totalWidth, height: 36)
        self.window?.setContentSize(NSSize(width: totalWidth, height: 36))
        label.frame = CGRect(x: 30, y: 9, width: textWidth, height: 18)

        // Position wave bars after text
        let waveStartX = 30 + textWidth + 8
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        for (i, bar) in waveBars.enumerated() {
            bar.frame = CGRect(x: waveStartX + CGFloat(i) * 5, y: 15, width: 2.5, height: 6)
            bar.backgroundColor = color.cgColor
            bar.opacity = isRecording ? 1.0 : 0.0
        }
        CATransaction.commit()

        if isRecording {
            startPulse()
            startWaveAnimation()
        } else if isProcessing {
            startPulse()
            stopWaveAnimation()
        } else {
            stopPulse()
            stopWaveAnimation()
        }
    }

    // MARK: - Wave Bar Animation

    private func startWaveAnimation() {
        for (i, bar) in waveBars.enumerated() {
            guard bar.animation(forKey: "wave") == nil else { continue }

            let minH: CGFloat = 4
            let maxH: CGFloat = 16
            let midY: CGFloat = 18  // center of capsule

            // Animate bounds height
            let heightAnim = CABasicAnimation(keyPath: "bounds.size.height")
            heightAnim.fromValue = minH
            heightAnim.toValue = maxH
            heightAnim.duration = 0.3 + Double(i) * 0.06
            heightAnim.autoreverses = true
            heightAnim.repeatCount = .infinity
            heightAnim.timingFunction = CAMediaTimingFunction(name: .easeIn)
            bar.add(heightAnim, forKey: "wave")

            // Animate position to keep centered
            let posAnim = CABasicAnimation(keyPath: "position.y")
            posAnim.fromValue = midY
            posAnim.toValue = midY
            posAnim.duration = 0.3 + Double(i) * 0.06
            posAnim.autoreverses = true
            posAnim.repeatCount = .infinity
            bar.add(posAnim, forKey: "wavePos")

            // Also add a slight glow
            bar.shadowColor = currentColor.cgColor
            bar.shadowRadius = 3
            bar.shadowOpacity = 0.6
            bar.shadowOffset = .zero
        }
    }

    private func stopWaveAnimation() {
        for bar in waveBars {
            bar.removeAnimation(forKey: "wave")
            bar.removeAnimation(forKey: "wavePos")
        }
    }

    // MARK: - Dot + Glow Pulse

    private func startPulse() {
        guard dotLayer.animation(forKey: "pulse") == nil else { return }
        let anim = CABasicAnimation(keyPath: "opacity")
        anim.fromValue = 1.0
        anim.toValue = 0.3
        anim.duration = 0.8
        anim.autoreverses = true
        anim.repeatCount = .infinity
        anim.timingFunction = CAMediaTimingFunction(name: .easeIn)
        dotLayer.add(anim, forKey: "pulse")

        let glowAnim = CABasicAnimation(keyPath: "shadowOpacity")
        glowAnim.fromValue = 0.3
        glowAnim.toValue = 0.7
        glowAnim.duration = 1.2
        glowAnim.autoreverses = true
        glowAnim.repeatCount = .infinity
        glowAnim.timingFunction = CAMediaTimingFunction(name: .easeIn)
        layer?.add(glowAnim, forKey: "glowPulse")
    }

    private func stopPulse() {
        dotLayer.removeAnimation(forKey: "pulse")
        layer?.removeAnimation(forKey: "glowPulse")
    }
}

// MARK: - Controller

final class FloatingIndicatorController {
    private var window: FloatingIndicatorWindow?
    private var capsuleView: NeonCapsuleView?

    func show(isRecording: Bool, isProcessing: Bool) {
        if window == nil {
            window = FloatingIndicatorWindow()
            let capsule = NeonCapsuleView(frame: NSRect(x: 0, y: 0, width: 200, height: 36))
            window?.contentView = capsule
            capsuleView = capsule
        }

        capsuleView?.update(isRecording: isRecording, isProcessing: isProcessing)
        window?.orderFrontRegardless()
    }

    func hide() {
        capsuleView?.update(isRecording: false, isProcessing: false)
        window?.orderOut(nil)
    }

    func update(isRecording: Bool, isProcessing: Bool) {
        if isRecording || isProcessing {
            show(isRecording: isRecording, isProcessing: isProcessing)
        } else {
            hide()
        }
    }
}
