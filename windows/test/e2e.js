// End-to-end pipeline test without a microphone:
// 1. downloads the pinned whisper.cpp binaries + tiny model into a temp root
// 2. synthesizes a spoken WAV with Windows SAPI text-to-speech
// 3. runs the app's own whisper.js transcribe() on it
// 4. asserts the transcript contains the spoken words
// Run: npm run test:e2e   (first run downloads ~90 MB)
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Give whisper.js an Electron-free root.
const ROOT = path.join(os.tmpdir(), "sudovoice-e2e");
const whisper = require("../src/whisper");
whisper.setRoot(ROOT);

const SPOKEN = "SudoVoice is an offline voice typing tool for Windows";

function synthesizeWav(text, dest) {
  const ps = `
    Add-Type -AssemblyName System.Speech;
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer;
    $fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono);
    $s.SetOutputToWaveFile('${dest.replace(/\\/g, "\\\\")}', $fmt);
    $s.Speak('${text}');
    $s.Dispose();
  `;
  execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
}

(async () => {
  console.log("[1/4] ensuring whisper engine + tiny model in", ROOT);
  await whisper.ensureSetup("tiny", (m) => process.stdout.write(`\r  ${m}          `));
  console.log("\n[2/4] synthesizing test speech via SAPI TTS");
  const wav = path.join(ROOT, "spoken.wav");
  synthesizeWav(SPOKEN, wav);
  if (!fs.existsSync(wav) || fs.statSync(wav).size < 1000) throw new Error("TTS wav not produced");

  console.log("[3/4] transcribing with whisper.cpp");
  const t0 = Date.now();
  const text = await whisper.transcribe(wav, { model: "tiny", language: "en" });
  console.log(`  -> "${text}" (${Date.now() - t0} ms)`);

  console.log("[4/4] asserting transcript");
  const norm = text.toLowerCase();
  const hits = ["voice", "offline", "windows", "typing"].filter((w) => norm.includes(w));
  if (hits.length < 3) throw new Error(`transcript too far off: "${text}"`);
  console.log(`PASS — matched ${hits.length}/4 keywords: ${hits.join(", ")}`);
})().catch((err) => { console.error("FAIL:", err.message); process.exit(1); });
