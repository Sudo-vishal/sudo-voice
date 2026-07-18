// SudoVoice for Windows — main process.
// Flow: hold hotkey → warm mic records → VAD cuts speech into chunks at pauses
// → each chunk hits the persistent whisper server (model stays loaded) →
// optional Gemini cleanup → text is typed at the cursor via paste injection,
// streaming out while you're still talking.
const {
  app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell, dialog, screen,
} = require("electron");
const path = require("path");

const settings = require("./settings");
const whisper = require("./whisper");
const injector = require("./injector");
const cleanup = require("./cleanup");
const updates = require("./updates");
const hotkey = require("./hotkey");
const supabase = require("./supabase");
const commands = require("./commands");
const punctuation = require("./punctuation");

// Known whisper hallucinations on silence/noise — dropped outright.
const HALLUCINATIONS = new Set([
  ".", "..", "...", "thank you.", "thanks for watching!", "thank you for watching!",
  "bye.", "bye!", "you", "thanks.", "thank you", "thanks for watching.",
  "subscribe", "like and subscribe", "mm.", "hmm.", "mm", "hmm", "uh", "um", "ah", "oh",
]);

let tray = null;
let indicatorWin = null;
let recorderWin = null;
let settingsWin = null;

// idle | setup | listening | transcribing | typing | error
let state = "idle";
// One dictation in flight: chunks append to `chain` so transcription order,
// cleanup, and injection stay serialized even though chunks arrive mid-speech.
let session = null;

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => openSettings());

function setState(next, detail) {
  state = next;
  if (indicatorWin && !indicatorWin.isDestroyed()) {
    indicatorWin.webContents.send("state", { state: next, detail: detail || "" });
  }
  if (tray) tray.setToolTip(`SudoVoice — ${next}${detail ? `: ${detail}` : ""}`);
}

function createIndicator() {
  const { workArea } = screen.getPrimaryDisplay();
  const w = 260, h = 44;
  indicatorWin = new BrowserWindow({
    width: w, height: h,
    x: workArea.x + Math.round((workArea.width - w) / 2),
    y: workArea.y + workArea.height - h - 16,
    frame: false, transparent: true, resizable: false, movable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false, show: false,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  indicatorWin.setAlwaysOnTop(true, "screen-saver");
  indicatorWin.setIgnoreMouseEvents(true);
  indicatorWin.loadFile(path.join(__dirname, "ui", "indicator.html"));
  indicatorWin.once("ready-to-show", () => indicatorWin.showInactive());
}

function createRecorder() {
  recorderWin = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false,
    },
  });
  recorderWin.loadFile(path.join(__dirname, "ui", "recorder.html"));
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) { settingsWin.focus(); return; }
  settingsWin = new BrowserWindow({
    width: 560, height: 720, resizable: false,
    title: "SudoVoice Settings",
    backgroundColor: "#04070F",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "build", "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  settingsWin.loadFile(path.join(__dirname, "ui", "settings.html"));
}

// ---------------------------------------------------------------- dictation
async function startDictation() {
  if (state !== "idle") return;
  if (!whisper.isReady(settings.get().model)) {
    setState("setup", "downloading model");
    try {
      await whisper.ensureSetup(settings.get().model, (msg) => setState("setup", msg));
    } catch (err) {
      setState("error", "setup failed");
      dialog.showErrorBox("SudoVoice setup failed", String(err && err.message || err));
      setTimeout(() => setState("idle"), 100);
      return;
    }
  }
  session = { chain: Promise.resolve(), raw: [], cleaned: [], pieces: [], injected: 0, failed: 0, seconds: 0 };
  whisper.startServer(settings.get().model).catch(() => {}); // pre-warm; chunks fall back to CLI if this fails
  setState("listening");
  recorderWin.webContents.send("rec:start");
}

async function stopDictation() {
  if (state !== "listening") return;
  setState("transcribing");
  recorderWin.webContents.send("rec:stop");
}

// Voice commands act on the live document. Edit commands (scratch that /
// delete word / clear all) backspace over the ledger of pieces this session
// already injected — the streaming equivalent of the Mac's unspoken buffer.
async function runCommand(cmd, s) {
  switch (cmd) {
    case "stopDictation": stopDictation(); return;
    case "selectAll": await injector.sendKeys("^a"); return;
    case "copy": await injector.sendKeys("^c"); return;
    case "paste": await injector.sendKeys("^v"); return;
    case "cut": await injector.sendKeys("^x"); return;
    case "pressEnter": await injector.sendKeys("{ENTER}"); return;
    case "scratchThat": {
      const last = s.pieces.pop();
      if (!last) return;
      s.raw.pop(); s.cleaned.pop(); s.injected--;
      await injector.sendKeys(`{BS ${last.length}}`);
      return;
    }
    case "deleteWord": {
      const last = s.pieces[s.pieces.length - 1];
      if (!last) return;
      const tail = (last.match(/\s*\S+\s*$/) || [last])[0];
      const kept = last.slice(0, last.length - tail.length);
      if (kept) {
        s.pieces[s.pieces.length - 1] = kept;
        s.cleaned[s.cleaned.length - 1] = kept.trim();
      } else {
        s.pieces.pop(); s.raw.pop(); s.cleaned.pop(); s.injected--;
      }
      await injector.sendKeys(`{BS ${tail.length}}`);
      return;
    }
    case "clearAll": {
      const total = s.pieces.reduce((n, p) => n + p.length, 0);
      s.pieces.length = 0; s.raw.length = 0; s.cleaned.length = 0; s.injected = 0;
      if (total) await injector.sendKeys(`{BS ${total}}`);
      return;
    }
  }
}

ipcMain.on("rec:chunk", (_evt, wavBuffer, _meta) => {
  if (!session || (state !== "listening" && state !== "transcribing")) return;
  const cfg = settings.get();
  const s = session;
  s.chain = s.chain.then(async () => {
    try {
      let text = await whisper.transcribeChunk(Buffer.from(wavBuffer), {
        model: cfg.model,
        language: cfg.language,
      });
      text = (text || "").trim();
      if (!text || /^[\[(*].*[\])*]$/.test(text)) return; // [BLANK_AUDIO], (wind blowing)…
      if (HALLUCINATIONS.has(text.toLowerCase())) return;
      if (cfg.voiceCommands) {
        const cmd = commands.detect(text); // on the RAW transcript, before cleanup
        if (cmd) { await runCommand(cmd, s); return; }
      }
      // Baseline: deterministic spoken punctuation; AI cleanup replaces it when it succeeds.
      let out = cfg.smartPunctuation ? punctuation.apply(text) : text;
      if (cfg.cleanup.enabled && cfg.cleanup.apiKey) {
        const cleaned = await cleanup.clean(text, cfg.cleanup);
        if (cleaned === "") return; // model says pure filler
        if (cleaned !== null) out = cleaned;
      }
      if (!out) return;
      const piece = (s.injected > 0 ? " " : "") + out;
      if (state === "listening") setState("listening", "typing…");
      else if (state === "transcribing") setState("typing");
      await injector.typeText(piece);
      // Ledger records only what actually landed in the document.
      s.raw.push(text); s.cleaned.push(out); s.pieces.push(piece); s.injected++;
      if (state === "listening") setState("listening");
    } catch (err) {
      s.failed++;
      console.error("chunk failed:", err);
    }
  });
});

ipcMain.on("rec:done", async (_evt, meta) => {
  if (!session) return;
  const s = session;
  session = null;
  s.seconds = meta?.seconds || 0;
  const cfg = settings.get();
  await s.chain; // all chunks were enqueued before rec:done (IPC is ordered)
  if (s.raw.length === 0 && s.failed > 0) {
    setState("error", "transcription failed");
    setTimeout(() => setState("idle"), 2500);
    return;
  }
  setState("idle");
  if (s.raw.length === 0) return; // pure silence
  const cleanupRan = cfg.cleanup.enabled && cfg.cleanup.apiKey;
  const rawText = s.raw.join(" ");
  const cleanedText = cleanupRan ? s.cleaned.join(" ") : null;
  // Sync to cloud history when signed in (fire-and-forget).
  supabase.saveDictation({
    rawText,
    cleanedText: cleanedText !== rawText ? cleanedText : null,
    language: cfg.language,
    model: cfg.model,
    cleanupModel: cleanupRan ? cfg.cleanup.model : null,
    durationSeconds: s.seconds,
  }).catch((err) => console.error("transcript sync failed:", err.message));
});

ipcMain.on("rec:error", (_evt, msg) => {
  setState("error", msg);
  setTimeout(() => setState("idle"), 2500);
});

// ------------------------------------------------------------------ settings IPC
ipcMain.handle("settings:get", () => settings.get());
ipcMain.handle("settings:set", (_evt, patch) => {
  const next = settings.set(patch);
  if ("launchAtLogin" in patch) {
    app.setLoginItemSettings({ openAtLogin: next.launchAtLogin });
  }
  if ("hotkeyMode" in patch || "toggleAccel" in patch) rebindHotkey();
  if ("model" in patch && whisper.isReady(next.model)) {
    whisper.startServer(next.model).catch(() => {}); // swap the warm model
  }
  return next;
});
ipcMain.handle("whisper:status", () => whisper.status(settings.get().model));
ipcMain.handle("whisper:download", async () => {
  await whisper.ensureSetup(settings.get().model, (msg) => {
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.webContents.send("setup:progress", msg);
    }
    setState(state === "idle" ? "idle" : state, msg);
  });
  whisper.startServer(settings.get().model).catch(() => {});
  return whisper.status(settings.get().model);
});
ipcMain.handle("app:version", () => app.getVersion());
ipcMain.handle("updates:check", () => updates.check(app.getVersion()));

// ------------------------------------------------------------------ account IPC
ipcMain.handle("auth:state", () => supabase.getState());
ipcMain.handle("auth:sendCode", (_evt, email) => supabase.sendCode(email));
ipcMain.handle("auth:verifyCode", async (_evt, { email, code }) => {
  const state = await supabase.verifyCode(email, code);
  supabase.checkLicense({ appVersion: app.getVersion(), force: true }).catch(() => {});
  return state;
});
ipcMain.handle("auth:signOut", () => supabase.signOut());
ipcMain.handle("auth:refreshLicense", async () => {
  await supabase.checkLicense({ appVersion: app.getVersion(), force: true });
  return supabase.getState();
});

// ------------------------------------------------------------------ hotkey
function rebindHotkey() {
  hotkey.unbind();
  const cfg = settings.get();
  hotkey.bind({
    mode: cfg.hotkeyMode,           // "hold" (push-to-talk) or "toggle"
    holdKey: cfg.holdKey,           // e.g. "CtrlRight"
    toggleAccel: cfg.toggleAccel,   // e.g. "Control+Shift+Space"
    onStart: startDictation,
    onStop: stopDictation,
    onToggle: () => (state === "listening" ? stopDictation() : startDictation()),
  });
}

// ------------------------------------------------------------------ tray
function createTray() {
  const img = nativeImage
    .createFromPath(path.join(__dirname, "..", "build", "icon.png"))
    .resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip("SudoVoice — idle");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "SudoVoice", enabled: false },
    { type: "separator" },
    { label: "Settings", click: openSettings },
    {
      label: "Check for updates",
      click: async () => {
        const r = await updates.check(app.getVersion());
        if (r.updateAvailable) {
          const { response } = await dialog.showMessageBox({
            message: `SudoVoice v${r.latest} is available (you have v${r.current}).`,
            buttons: ["Download", "Later"],
          });
          if (response === 0) shell.openExternal(r.downloadURL);
        } else {
          dialog.showMessageBox({ message: `You're up to date (v${r.current}).` });
        }
      },
    },
    { label: "Website", click: () => shell.openExternal("https://sudovoice.com") },
    { type: "separator" },
    { label: "Quit SudoVoice", click: () => app.quit() },
  ]));
  tray.on("double-click", openSettings);
}

// ------------------------------------------------------------------ boot
app.whenReady().then(() => {
  // Grant mic permission to our own hidden recorder window.
  const ses = require("electron").session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === "media"));

  createIndicator();
  createRecorder();
  createTray();
  rebindHotkey();

  if (settings.get().firstRun) {
    openSettings();
    settings.set({ firstRun: false });
  }

  // Non-blocking update check on launch.
  updates.check(app.getVersion()).then((r) => {
    if (r.updateAvailable) tray.setToolTip(`SudoVoice — update v${r.latest} available`);
  }).catch(() => {});

  // Non-blocking license revalidation on launch (24h cache, 7-day offline grace).
  supabase.checkLicense({ appVersion: app.getVersion() }).catch(() => {});

  // Warm the whisper server so the first dictation transcribes instantly.
  if (whisper.isReady(settings.get().model)) {
    whisper.startServer(settings.get().model).catch(() => {});
  }
});

app.on("window-all-closed", (e) => e.preventDefault?.()); // tray app: keep running
app.on("before-quit", () => { hotkey.unbind(); whisper.stopServer(); });
