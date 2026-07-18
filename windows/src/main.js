// SudoVoice for Windows — main process.
// Flow: hold hotkey → record mic → whisper.cpp transcribes offline →
// optional Gemini cleanup → text is typed at the cursor via paste injection.
const {
  app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell, dialog, screen,
} = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

const settings = require("./settings");
const whisper = require("./whisper");
const injector = require("./injector");
const cleanup = require("./cleanup");
const updates = require("./updates");
const hotkey = require("./hotkey");
const supabase = require("./supabase");

let tray = null;
let indicatorWin = null;
let recorderWin = null;
let settingsWin = null;

// idle | setup | listening | transcribing | typing | error
let state = "idle";
let pendingAudio = null;

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
  setState("listening");
  recorderWin.webContents.send("rec:start");
}

async function stopDictation() {
  if (state !== "listening") return;
  setState("transcribing");
  recorderWin.webContents.send("rec:stop");
}

ipcMain.on("rec:data", async (_evt, wavBuffer) => {
  if (state !== "transcribing") return;
  const cfg = settings.get();
  const wavPath = path.join(os.tmpdir(), `sudovoice-${Date.now()}.wav`);
  try {
    fs.writeFileSync(wavPath, Buffer.from(wavBuffer));
    let text = await whisper.transcribe(wavPath, {
      model: cfg.model,
      language: cfg.language,
    });
    text = (text || "").trim();
    if (!text || /^\[.*\]$/.test(text)) { setState("idle"); return; } // silence / [BLANK_AUDIO]
    const rawText = text;
    let cleanupRan = false;
    if (cfg.cleanup.enabled && cfg.cleanup.apiKey) {
      setState("transcribing", "cleaning");
      text = await cleanup.clean(text, cfg.cleanup);
      cleanupRan = true;
    }
    setState("typing");
    await injector.typeText(text);
    setState("idle");
    // Sync to cloud history when signed in (fire-and-forget, never blocks typing).
    supabase.saveDictation({
      rawText,
      cleanedText: cleanupRan && text !== rawText ? text : null,
      language: cfg.language,
      model: cfg.model,
      cleanupModel: cleanupRan ? cfg.cleanup.model : null,
      durationSeconds: (wavBuffer.byteLength - 44) / 32000, // 16kHz mono 16-bit PCM
    }).catch((err) => console.error("transcript sync failed:", err.message));
  } catch (err) {
    console.error("dictation failed:", err);
    setState("error", String(err && err.message || err).slice(0, 60));
    setTimeout(() => setState("idle"), 2500);
  } finally {
    fs.unlink(wavPath, () => {});
  }
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
});

app.on("window-all-closed", (e) => e.preventDefault?.()); // tray app: keep running
app.on("before-quit", () => hotkey.unbind());
