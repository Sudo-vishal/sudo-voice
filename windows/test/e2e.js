// End-to-end pipeline test without a microphone:
// 1. downloads the pinned whisper.cpp binaries + tiny model into a temp root
// 2. synthesizes a spoken WAV with Windows SAPI text-to-speech
// 3. runs the app's own whisper.js transcribe() on it (one-shot CLI path)
// 4. asserts the transcript contains the spoken words
// 5. repeats via the persistent whisper-server path (transcribeChunk)
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

function assertTranscript(text, label) {
  const norm = text.toLowerCase();
  const hits = ["voice", "offline", "windows", "typing"].filter((w) => norm.includes(w));
  if (hits.length < 3) throw new Error(`${label} transcript too far off: "${text}"`);
  console.log(`  ${label} OK — matched ${hits.length}/4 keywords: ${hits.join(", ")}`);
}

(async () => {
  console.log("[1/6] ensuring whisper engine + tiny model in", ROOT);
  await whisper.ensureSetup("tiny", (m) => process.stdout.write(`\r  ${m}          `));
  console.log("\n[2/6] synthesizing test speech via SAPI TTS");
  const wav = path.join(ROOT, "spoken.wav");
  synthesizeWav(SPOKEN, wav);
  if (!fs.existsSync(wav) || fs.statSync(wav).size < 1000) throw new Error("TTS wav not produced");

  console.log("[3/6] transcribing with whisper-cli (one-shot fallback path)");
  let t0 = Date.now();
  const cliText = await whisper.transcribe(wav, { model: "tiny", language: "en" });
  console.log(`  -> "${cliText}" (${Date.now() - t0} ms)`);

  console.log("[4/6] asserting CLI transcript");
  assertTranscript(cliText, "cli");

  console.log("[5/6] transcribing via persistent whisper-server (streaming path)");
  t0 = Date.now();
  const port = await whisper.startServer("tiny");
  console.log(`  server up on :${port} (${Date.now() - t0} ms incl. model load)`);
  const buf = fs.readFileSync(wav);
  t0 = Date.now();
  const srvText = await whisper.transcribeChunk(buf, { model: "tiny", language: "en" });
  console.log(`  -> "${srvText}" (${Date.now() - t0} ms warm)`);

  console.log("[6/6] asserting server transcript");
  assertTranscript(srvText, "server");
  whisper.stopServer();
  console.log("PASS — both inference paths agree with the spoken text");
})().catch((err) => { console.error("FAIL:", err.message); whisper.stopServer(); process.exit(1); });
