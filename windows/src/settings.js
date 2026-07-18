// Persistent settings — JSON file in the user's app-data directory.
const fs = require("fs");
const path = require("path");

let FILE = null;
function file() {
  if (!FILE) {
    FILE = path.join(require("electron").app.getPath("userData"), "settings.json");
  }
  return FILE;
}

const DEFAULTS = {
  firstRun: true,
  hotkeyMode: "hold",              // "hold" = push-to-talk, "toggle" = press to start/stop
  holdKey: "CtrlRight",            // uiohook key name for hold mode
  toggleAccel: "Control+Shift+Space",
  model: "base",                   // tiny | base | small (ggml whisper models)
  language: "auto",                // auto | en | hi | ...
  voiceCommands: true,             // "scratch that", "select all", "press enter", "stop"…
  smartPunctuation: true,          // say "comma", "period", "new line"…
  cleanup: {
    enabled: false,
    apiKey: "",                    // user-supplied Gemini API key (SUDOVOICE_GEMINI_KEY env also works)
    // Rolling alias — pinned models (e.g. gemini-2.5-flash) 404 for new API keys
    model: "gemini-flash-latest",
    smartLists: true,              // format spoken enumerations as "- " lists
  },
  launchAtLogin: false,
};

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file(), "utf8")) };
    cache.cleanup = { ...DEFAULTS.cleanup, ...(cache.cleanup || {}) };
  } catch {
    cache = { ...DEFAULTS };
  }
  if (!cache.cleanup.apiKey && process.env.SUDOVOICE_GEMINI_KEY) {
    cache.cleanup.apiKey = process.env.SUDOVOICE_GEMINI_KEY;
  }
  return cache;
}

function save() {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(cache, null, 2));
}

module.exports = {
  get: () => ({ ...load(), cleanup: { ...load().cleanup } }),
  set(patch) {
    load();
    if (patch.cleanup) patch = { ...patch, cleanup: { ...cache.cleanup, ...patch.cleanup } };
    cache = { ...cache, ...patch };
    save();
    return module.exports.get();
  },
};
