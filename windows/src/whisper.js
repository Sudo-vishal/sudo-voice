// whisper.cpp manager — downloads the pinned Windows binaries + ggml model on
// first run, then runs offline transcription forever after. No cloud.
// Two inference paths: a persistent whisper-server (model stays loaded in RAM,
// used for low-latency chunk streaming) and one-shot whisper-cli as fallback.
const { execFile, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const extract = require("extract-zip");

const WHISPER_ZIP_URL =
  "https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.1/whisper-bin-x64.zip";
const MODEL_BASE_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main";
const MODEL_SIZES_MB = { tiny: 75, base: 142, small: 466 };

// Paths are injectable so test/e2e.js can run this module outside Electron.
let root = null;
function setRoot(dir) { root = dir; }
function getRoot() {
  if (root) return root;
  const { app } = require("electron");
  root = app.getPath("userData");
  return root;
}
const binDir = () => path.join(getRoot(), "bin");
const cliPath = () => path.join(binDir(), "whisper-cli.exe");
const serverPath = () => path.join(binDir(), "whisper-server.exe");
const modelPath = (model) => path.join(getRoot(), "models", `ggml-${model}.bin`);
const threads = () => String(Math.max(2, os.cpus().length - 2));

function isReady(model) {
  return fs.existsSync(cliPath()) && fs.existsSync(modelPath(model));
}

function status(model) {
  return {
    binaryInstalled: fs.existsSync(cliPath()),
    modelInstalled: fs.existsSync(modelPath(model)),
    model,
    modelSizeMB: MODEL_SIZES_MB[model] || 0,
    dir: getRoot(),
  };
}

async function download(url, dest, label, onProgress) {
  const res = await fetch(url); // follows redirects (GitHub/HF both redirect)
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} from ${url}`);
  const total = Number(res.headers.get("content-length")) || 0;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  const out = fs.createWriteStream(tmp);
  let done = 0, lastPct = -1;
  for await (const chunk of res.body) {
    out.write(chunk);
    done += chunk.length;
    if (total && onProgress) {
      const pct = Math.floor((done / total) * 100);
      if (pct !== lastPct) { lastPct = pct; onProgress(`${label} ${pct}%`); }
    }
  }
  await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
  fs.renameSync(tmp, dest);
}

async function ensureSetup(model, onProgress = () => {}) {
  if (!fs.existsSync(cliPath())) {
    const zip = path.join(os.tmpdir(), "sudovoice-whisper-bin.zip");
    await download(WHISPER_ZIP_URL, zip, "whisper engine", onProgress);
    onProgress("extracting engine");
    const tmpDir = path.join(os.tmpdir(), `sudovoice-whisper-${Date.now()}`);
    await extract(zip, { dir: tmpDir });
    // Zip layout: Release/whisper-cli.exe + whisper-server.exe + required DLLs.
    const rel = path.join(tmpDir, "Release");
    fs.mkdirSync(binDir(), { recursive: true });
    for (const f of fs.readdirSync(rel)) {
      if (f === "whisper-cli.exe" || f === "whisper-server.exe" || f.endsWith(".dll")) {
        fs.copyFileSync(path.join(rel, f), path.join(binDir(), f));
      }
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.unlink(zip, () => {});
  }
  if (!fs.existsSync(modelPath(model))) {
    await download(
      `${MODEL_BASE_URL}/ggml-${model}.bin`,
      modelPath(model),
      `model (${MODEL_SIZES_MB[model] || "?"}MB)`,
      onProgress
    );
  }
  onProgress("ready");
}

function transcribe(wavPath, { model = "base", language = "auto", timeoutMs = 120000 } = {}) {
  const args = [
    "-m", modelPath(model),
    "-f", wavPath,
    "-np",           // no debug prints
    "-nt",           // no timestamps
    "-l", language,
    "-t", threads(),
  ];
  return new Promise((resolve, reject) => {
    execFile(cliPath(), args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`whisper failed: ${stderr || err.message}`));
        resolve(stdout.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean).join(" "));
      });
  });
}

// --------------------------------------------------------------- warm server
// Installs that predate server mode have whisper-cli.exe but no
// whisper-server.exe — pull the pinned zip once and extract just what's missing.
async function ensureServerBinary(onProgress = () => {}) {
  if (fs.existsSync(serverPath())) return;
  const zip = path.join(os.tmpdir(), "sudovoice-whisper-bin.zip");
  await download(WHISPER_ZIP_URL, zip, "engine update", onProgress);
  const tmpDir = path.join(os.tmpdir(), `sudovoice-whisper-${Date.now()}`);
  await extract(zip, { dir: tmpDir });
  const rel = path.join(tmpDir, "Release");
  fs.mkdirSync(binDir(), { recursive: true });
  for (const f of fs.readdirSync(rel)) {
    if (f === "whisper-server.exe" || (f.endsWith(".dll") && !fs.existsSync(path.join(binDir(), f)))) {
      fs.copyFileSync(path.join(rel, f), path.join(binDir(), f));
    }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.unlink(zip, () => {});
}

let server = null;       // { child, port, model }
let serverStarting = null;

async function waitReady(port, child) {
  for (let i = 0; i < 150; i++) {          // up to ~30s (big models load slowly)
    if (child.exitCode !== null) return false;
    try {
      await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(500) });
      return true;
    } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  return false;
}

async function startServer(model, onProgress = () => {}) {
  if (server && server.model === model && server.child.exitCode === null) return server.port;
  if (serverStarting) return serverStarting;
  serverStarting = (async () => {
    stopServer();
    if (!fs.existsSync(modelPath(model))) throw new Error(`model ${model} not installed`);
    await ensureServerBinary(onProgress);
    // Port may be taken (another app, or a stale instance) — walk a small range.
    for (let port = 43117; port < 43127; port++) {
      const child = spawn(serverPath(), [
        "-m", modelPath(model),
        "--host", "127.0.0.1",
        "--port", String(port),
        "-t", threads(),
        "-nt",
      ], { stdio: "ignore", windowsHide: true });
      if (await waitReady(port, child)) {
        child.on("exit", () => { if (server && server.child === child) server = null; });
        server = { child, port, model };
        return port;
      }
      try { child.kill(); } catch { /* already dead */ }
    }
    throw new Error("whisper server failed to start");
  })();
  try { return await serverStarting; } finally { serverStarting = null; }
}

function stopServer() {
  if (server) {
    try { server.child.kill(); } catch { /* already dead */ }
    server = null;
  }
}

async function postInference(port, wavBuffer, language, timeoutMs) {
  const form = new FormData();
  form.append("file", new Blob([wavBuffer]), "audio.wav");
  form.append("response_format", "json");
  form.append("language", language || "auto");
  const res = await fetch(`http://127.0.0.1:${port}/inference`, {
    method: "POST", body: form, signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`whisper server: HTTP ${res.status}`);
  const data = await res.json();
  return (data.text || "").trim();
}

// Preferred inference path: warm server, one restart retry if it died, then
// one-shot CLI as the last resort so dictation still works without the server.
// If the server isn't up quickly (e.g. binary still downloading on the first
// launch after an update), this chunk uses the CLI while warm-up continues.
async function transcribeChunk(wavBuffer, { model = "base", language = "auto", timeoutMs = 60000 } = {}) {
  try {
    const starting = startServer(model);
    starting.catch(() => {}); // still awaited below or via the next chunk
    const port = await Promise.race([
      starting,
      new Promise((_, rej) => setTimeout(() => rej(new Error("server warming up")), 2500)),
    ]);
    try {
      return await postInference(port, wavBuffer, language, timeoutMs);
    } catch {
      stopServer();
      return await postInference(await startServer(model), wavBuffer, language, timeoutMs);
    }
  } catch (serverErr) {
    const wavPath = path.join(os.tmpdir(), `sudovoice-chunk-${process.hrtime.bigint()}.wav`);
    fs.writeFileSync(wavPath, wavBuffer);
    try {
      return await transcribe(wavPath, { model, language });
    } finally {
      fs.unlink(wavPath, () => {});
    }
  }
}

module.exports = {
  isReady, status, ensureSetup, transcribe, setRoot,
  startServer, stopServer, transcribeChunk,
};
