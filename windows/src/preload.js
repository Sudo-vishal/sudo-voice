const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("sudovoice", {
  // indicator
  onState: (cb) => ipcRenderer.on("state", (_e, s) => cb(s)),
  // recorder
  onRecStart: (cb) => ipcRenderer.on("rec:start", cb),
  onRecStop: (cb) => ipcRenderer.on("rec:stop", cb),
  sendRecChunk: (buf, meta) => ipcRenderer.send("rec:chunk", buf, meta),
  sendRecDone: (meta) => ipcRenderer.send("rec:done", meta),
  sendRecError: (msg) => ipcRenderer.send("rec:error", msg),
  // settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (patch) => ipcRenderer.invoke("settings:set", patch),
  whisperStatus: () => ipcRenderer.invoke("whisper:status"),
  whisperDownload: () => ipcRenderer.invoke("whisper:download"),
  onSetupProgress: (cb) => ipcRenderer.on("setup:progress", (_e, m) => cb(m)),
  appVersion: () => ipcRenderer.invoke("app:version"),
  checkUpdates: () => ipcRenderer.invoke("updates:check"),
  installUpdate: () => ipcRenderer.invoke("updates:install"),
  onUpdateProgress: (cb) => ipcRenderer.on("update:progress", (_e, m) => cb(m)),
  // account
  authState: () => ipcRenderer.invoke("auth:state"),
  authSendCode: (email) => ipcRenderer.invoke("auth:sendCode", email),
  authVerifyCode: (email, code) => ipcRenderer.invoke("auth:verifyCode", { email, code }),
  authSignOut: () => ipcRenderer.invoke("auth:signOut"),
  authRefreshLicense: () => ipcRenderer.invoke("auth:refreshLicense"),
});
