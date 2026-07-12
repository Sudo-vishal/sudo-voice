// Global hotkey — push-to-talk (hold a key, release to type) via uiohook-napi's
// low-level keyboard hook. Falls back to an Electron globalShortcut toggle if
// the native hook can't load.
const { globalShortcut } = require("electron");

let hook = null;
let UiohookKey = null;
try {
  ({ uIOhook: hook, UiohookKey } = require("uiohook-napi"));
} catch (err) {
  console.warn("uiohook-napi unavailable, hold-to-talk disabled:", err.message);
}

let active = false;
let hookStarted = false;
let keydownHandler = null;
let keyupHandler = null;
let registeredAccel = null;

function bind({ mode, holdKey, toggleAccel, onStart, onStop, onToggle }) {
  unbind();
  if (mode === "hold" && hook && UiohookKey && UiohookKey[holdKey]) {
    const code = UiohookKey[holdKey];
    let down = false;
    keydownHandler = (e) => {
      if (e.keycode === code && !down) { down = true; onStart(); }
    };
    keyupHandler = (e) => {
      if (e.keycode === code && down) { down = false; onStop(); }
    };
    hook.on("keydown", keydownHandler);
    hook.on("keyup", keyupHandler);
    if (!hookStarted) { hook.start(); hookStarted = true; }
    active = true;
    return { mode: "hold", key: holdKey };
  }
  // Toggle fallback (also the explicit "toggle" mode).
  try {
    globalShortcut.register(toggleAccel, onToggle);
    registeredAccel = toggleAccel;
    active = true;
    return { mode: "toggle", key: toggleAccel };
  } catch (err) {
    console.error("hotkey registration failed:", err);
    return { mode: "none", key: "" };
  }
}

function unbind() {
  if (!active) return;
  if (hook && keydownHandler) {
    hook.off("keydown", keydownHandler);
    hook.off("keyup", keyupHandler);
    keydownHandler = keyupHandler = null;
  }
  if (registeredAccel) {
    try { globalShortcut.unregister(registeredAccel); } catch {}
    registeredAccel = null;
  }
  active = false;
}

module.exports = { bind, unbind };
