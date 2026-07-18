// Streaming pipeline test without a microphone or real windows:
// loads the actual main.js under a stubbed Electron, then drives the
// rec:chunk / rec:done IPC handlers with SAPI-TTS WAV "chunks" exactly as the
// recorder would send them. Asserts chunk texts are injected in order while
// "recording" and that the joined transcript is handed to sync at the end.
// Run: npm run test:streaming   (reuses the test:e2e engine download)
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");

const ROOT = path.join(os.tmpdir(), "sudovoice-e2e");        // shared with test/e2e.js
const USERDATA = path.join(os.tmpdir(), "sudovoice-streaming-userdata");
fs.mkdirSync(USERDATA, { recursive: true });
fs.writeFileSync(path.join(USERDATA, "settings.json"),
  JSON.stringify({ firstRun: false, model: "tiny", language: "en" }));

// ---- stubs -----------------------------------------------------------------
const ipcHandlers = { on: {}, handle: {} };
const injected = [];   // what injector.typeText received, in order
const keysSent = [];   // what injector.sendKeys received (voice commands)
const synced = [];     // what supabase.saveDictation received
let hotkeyCbs = null;
const recorderSends = [];

class FakeWindow {
  constructor() { this.webContents = { send: (ch, ...a) => recorderSends.push(ch) }; }
  loadFile() {} once() {} focus() {} isDestroyed() { return false; }
  setAlwaysOnTop() {} setIgnoreMouseEvents() {} showInactive() {}
}
const electronStub = {
  app: {
    requestSingleInstanceLock: () => true,
    on: () => {}, whenReady: () => Promise.resolve(),
    getPath: () => USERDATA, getVersion: () => "0.0.0-test",
    setLoginItemSettings: () => {}, quit: () => {},
  },
  BrowserWindow: FakeWindow,
  Tray: class { setToolTip() {} setContextMenu() {} on() {} },
  Menu: { buildFromTemplate: () => ({}) },
  nativeImage: { createFromPath: () => ({ resize: () => ({}) }) },
  shell: { openExternal: () => {} },
  dialog: { showErrorBox: () => {}, showMessageBox: async () => ({ response: 1 }) },
  screen: { getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }) },
  session: { defaultSession: { setPermissionRequestHandler: () => {} } },
  ipcMain: {
    on: (ch, fn) => { ipcHandlers.on[ch] = fn; },
    handle: (ch, fn) => { ipcHandlers.handle[ch] = fn; },
  },
};

const origLoad = Module._load;
Module._load = function (request, parent) {
  if (request === "electron") return electronStub;
  if (request.endsWith("/injector") || request.endsWith("\\injector") || request === "./injector") {
    return {
      typeText: async (t) => { injected.push(t); },
      sendKeys: async (k) => { keysSent.push(k); },
    };
  }
  if (request === "./supabase") {
    return {
      saveDictation: async (row) => { synced.push(row); },
      checkLicense: async () => null, getState: () => ({ signedIn: false }),
      sendCode: async () => {}, verifyCode: async () => {}, signOut: async () => {},
    };
  }
  if (request === "./hotkey") {
    return { bind: (cbs) => { hotkeyCbs = cbs; }, unbind: () => {} };
  }
  if (request === "./updates") return { check: async () => ({ updateAvailable: false }) };
  return origLoad.apply(this, arguments);
};

const whisper = require("../src/whisper");
whisper.setRoot(ROOT); // binaries/models live in the e2e root, not USERDATA

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
  console.log("[1/5] ensuring whisper engine + tiny model in", ROOT);
  await whisper.ensureSetup("tiny", (m) => process.stdout.write(`\r  ${m}          `));

  console.log("\n[2/5] loading main.js under stubbed Electron");
  require("../src/main");
  await new Promise((r) => setTimeout(r, 50)); // let whenReady handlers run
  if (!hotkeyCbs) throw new Error("main.js never bound the hotkey");
  if (!ipcHandlers.on["rec:chunk"] || !ipcHandlers.on["rec:done"]) {
    throw new Error("rec:chunk / rec:done handlers not registered");
  }

  console.log("[3/5] synthesizing spoken chunks via SAPI TTS (two sentences + a voice command)");
  const wavA = path.join(ROOT, "chunk-a.wav");
  const wavB = path.join(ROOT, "chunk-b.wav");
  const wavCmd = path.join(ROOT, "chunk-cmd.wav");
  synthesizeWav("The first sentence streams while I am still speaking", wavA);
  synthesizeWav("And the second sentence follows right after", wavB);
  synthesizeWav("press enter", wavCmd);

  console.log("[4/5] driving a dictation: start -> chunk A -> chunk B -> \"press enter\" -> stop -> done");
  await hotkeyCbs.onStart();                       // startDictation
  if (!recorderSends.includes("rec:start")) throw new Error("recorder never told to start");
  ipcHandlers.on["rec:chunk"](null, fs.readFileSync(wavA), { seq: 0 });
  ipcHandlers.on["rec:chunk"](null, fs.readFileSync(wavB), { seq: 1 });
  ipcHandlers.on["rec:chunk"](null, fs.readFileSync(wavCmd), { seq: 2 });
  await hotkeyCbs.onStop();                        // stopDictation
  await ipcHandlers.on["rec:done"](null, { seconds: 7.5, chunks: 3 });

  console.log("[5/5] asserting streamed output");
  console.log(`  injected pieces: ${JSON.stringify(injected)}`);
  console.log(`  keys sent: ${JSON.stringify(keysSent)}`);
  if (injected.length !== 2) throw new Error(`expected 2 injections, got ${injected.length}`);
  const a = injected[0].toLowerCase(), b = injected[1].toLowerCase();
  if (!a.includes("first sentence")) throw new Error(`chunk A wrong/out of order: "${injected[0]}"`);
  if (!b.startsWith(" ") || !b.includes("second sentence")) {
    throw new Error(`chunk B wrong (must be ordered + space-joined): "${injected[1]}"`);
  }
  if (!keysSent.includes("{ENTER}")) {
    throw new Error(`"press enter" voice command did not send {ENTER}: ${JSON.stringify(keysSent)}`);
  }
  if (synced.length !== 1) throw new Error(`expected 1 synced transcript, got ${synced.length}`);
  if (!synced[0].rawText.toLowerCase().includes("second sentence") || synced[0].durationSeconds !== 7.5) {
    throw new Error(`bad sync payload: ${JSON.stringify(synced[0])}`);
  }
  if (synced[0].rawText.toLowerCase().includes("press enter")) {
    throw new Error("voice command leaked into the synced transcript");
  }
  whisper.stopServer();
  console.log("PASS — streaming, in-order injection, voice command executed, clean sync");
  process.exit(0);
})().catch((err) => { console.error("FAIL:", err.message); whisper.stopServer(); process.exit(1); });
