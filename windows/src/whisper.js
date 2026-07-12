// whisper.cpp manager — downloads the pinned Windows binaries + ggml model on
// first run, then runs offline transcription forever after. No cloud.
const { execFile } = require("child_process");
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
const modelPath = (model) => path.join(getRoot(), "models", `ggml-${model}.bin`);

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
    // Zip layout: Release/whisper-cli.exe + required DLLs.
    const rel = path.join(tmpDir, "Release");
    fs.mkdirSync(binDir(), { recursive: true });
    for (const f of fs.readdirSync(rel)) {
      if (f === "whisper-cli.exe" || f.endsWith(".dll")) {
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
    "-t", String(Math.max(2, os.cpus().length - 2)),
  ];
  return new Promise((resolve, reject) => {
    execFile(cliPath(), args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`whisper failed: ${stderr || err.message}`));
        resolve(stdout.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean).join(" "));
      });
  });
}

module.exports = { isReady, status, ensureSetup, transcribe, setRoot };
