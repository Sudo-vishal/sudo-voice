import OSDownload from "./OSDownload";
import { DOWNLOADS } from "@/app/lib/downloads";

export default function Download() {
  return (
    <section id="download" className="py-24 px-6 relative">
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-14">
          <div className="kicker mb-4">$ sudovoice --install</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Install once. <span className="text-[#5C6E8A]">Own it forever.</span>
          </h2>
          <p className="mt-4 text-[#8FA3BF] text-lg max-w-xl">
            Windows, macOS, and Android. You&apos;re dictating in 60 seconds — no
            account required.
          </p>
          <div className="mt-8">
            <OSDownload />
          </div>
        </div>

        {/* platform terminals */}
        <div className="grid md:grid-cols-3 gap-5">
          {/* Windows */}
          <div className="term">
            <div className="term-bar">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-2 font-mono text-xs text-[#5C6E8A]">windows</span>
              <span className="ml-auto font-mono text-xs text-[#4FC3F7]">.exe</span>
            </div>
            <div className="p-6">
              <div className="font-mono text-[13px] text-[#8FA3BF] space-y-1.5 mb-6">
                <div><span className="text-[#5C6E8A]">os:</span> Windows 10 / 11 (x64)</div>
                <div><span className="text-[#5C6E8A]">hotkey:</span> hold Right Ctrl to talk</div>
                <div><span className="text-[#5C6E8A]">engine:</span> offline Whisper (whisper.cpp)</div>
                <div><span className="text-[#5C6E8A]">runs as:</span> system tray app</div>
                <div><span className="text-[#5C6E8A]">network:</span> first model download only</div>
              </div>
              <a
                href={DOWNLOADS.windows.href}
                className="btn-primary w-full justify-center px-6 py-3.5 text-base"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                </svg>
                Download .exe
              </a>
            </div>
          </div>

          {/* macOS */}
          <div className="term">
            <div className="term-bar">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-2 font-mono text-xs text-[#5C6E8A]">macos</span>
              <span className="ml-auto font-mono text-xs text-[#4FC3F7]">.dmg</span>
            </div>
            <div className="p-6">
              <div className="font-mono text-[13px] text-[#8FA3BF] space-y-1.5 mb-6">
                <div><span className="text-[#5C6E8A]">os:</span> macOS 14 Sonoma+</div>
                <div><span className="text-[#5C6E8A]">chip:</span> Apple Silicon &amp; Intel</div>
                <div><span className="text-[#5C6E8A]">ram:</span> 4 GB min (8 GB for Large)</div>
                <div><span className="text-[#5C6E8A]">network:</span> first model download only</div>
              </div>
              <a
                href={DOWNLOADS.macos.href}
                className="btn-ghost w-full justify-center px-6 py-3.5 text-base font-semibold"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Download .dmg
              </a>
            </div>
          </div>

          {/* Android */}
          <div className="term">
            <div className="term-bar">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              <span className="ml-2 font-mono text-xs text-[#5C6E8A]">android</span>
              <span className="ml-auto font-mono text-xs text-[#4FC3F7]">.apk</span>
            </div>
            <div className="p-6">
              <div className="font-mono text-[13px] text-[#8FA3BF] space-y-1.5 mb-6">
                <div><span className="text-[#5C6E8A]">os:</span> Android 8.0+</div>
                <div><span className="text-[#5C6E8A]">install:</span> sideload the APK</div>
                <div><span className="text-[#5C6E8A]">setup:</span> enable the keyboard (IME)</div>
                <div><span className="text-[#5C6E8A]">store:</span> no Play Store needed</div>
              </div>
              <a
                href={DOWNLOADS.android.href}
                className="btn-ghost w-full justify-center px-6 py-3.5 text-base font-semibold"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.523 15.341a.998.998 0 1 1 .001-1.996.998.998 0 0 1-.001 1.996m-11.046 0a.998.998 0 1 1 .001-1.996.998.998 0 0 1-.001 1.996m11.405-6.02 1.997-3.46a.416.416 0 0 0-.152-.567.416.416 0 0 0-.568.152l-2.022 3.503C15.602 8.24 13.855 7.86 12 7.86s-3.602.38-5.137 1.089L4.84 5.446a.416.416 0 0 0-.567-.152.416.416 0 0 0-.153.567l1.997 3.46C2.688 11.186.343 14.658 0 18.761h24c-.344-4.103-2.688-7.575-6.118-9.44" />
                </svg>
                Download .apk
              </a>
            </div>
          </div>
        </div>

        {/* linux + chrome note */}
        <div className="mt-5 flex flex-wrap justify-center gap-3 font-mono text-[13px]">
          <span className="px-4 py-2 rounded border border-[#1C2940] text-[#5C6E8A]">
            [ linux: coming soon ]
          </span>
          <span
            aria-disabled="true"
            title="Chrome extension coming soon"
            className="px-4 py-2 rounded border border-[#1C2940] text-[#5C6E8A] cursor-default select-none"
          >
            $ chrome --soon
          </span>
        </div>

        {/* first-run warnings */}
        <div className="mt-10 grid md:grid-cols-2 gap-5">
          {/* Windows smartscreen */}
          <div className="panel p-6">
            <div className="font-mono text-[13px] text-[#FFBD2E] mb-3">
              ⚠ warn: &ldquo;Windows protected your PC&rdquo;
            </div>
            <p className="text-[#8FA3BF] text-sm leading-relaxed mb-4">
              SmartScreen flags installers without established reputation — v1 is
              unsigned. The installer is exactly what the button serves:
            </p>
            <ol className="space-y-2 font-mono text-[13px] text-[#8FA3BF]">
              <li><span className="text-[#00E676]">1.</span> Click <span className="text-white">More info</span></li>
              <li><span className="text-[#00E676]">2.</span> Click <span className="text-white">Run anyway</span></li>
              <li><span className="text-[#00E676]">3.</span> Installer proceeds normally</li>
            </ol>
            <p className="mt-4 text-xs text-[#5C6E8A] leading-relaxed">
              If it hangs: right-click the .exe → Properties → tick Unblock → Apply → re-run.
            </p>
          </div>

          {/* Mac gatekeeper */}
          <div className="panel p-6">
            <div className="font-mono text-[13px] text-[#FFBD2E] mb-3">
              ⚠ warn: &ldquo;Apple could not verify…&rdquo;
            </div>
            <p className="text-[#8FA3BF] text-sm leading-relaxed mb-4">
              Normal for apps not yet notarized by Apple. SudoVoice runs fully
              on-device — one-time approval:
            </p>
            <ol className="space-y-2 font-mono text-[13px] text-[#8FA3BF]">
              <li><span className="text-[#00E676]">1.</span> Open the app → macOS blocks it → click <span className="text-white">Done</span></li>
              <li><span className="text-[#00E676]">2.</span> System Settings → <span className="text-white">Privacy &amp; Security</span></li>
              <li><span className="text-[#00E676]">3.</span> &ldquo;SudoVoice was blocked&rdquo; → <span className="text-white">Open Anyway</span></li>
            </ol>
            <p className="mt-4 text-xs text-[#5C6E8A] leading-relaxed">
              One-time only. On macOS 13 and earlier: right-click the app → Open → Open.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
