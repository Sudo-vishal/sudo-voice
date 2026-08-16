// Update check + self-update against the SudoVoice release manifest. Domain
// first, GitHub raw as fallback while sudovoice.com is not yet live. The
// manifest carries the installer's sha256 (written by release.yml), so the
// downloaded exe is hash-verified before it is ever executed.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const MANIFEST_URLS = [
  "https://sudovoice.com/releases/latest-windows.json",
  "https://raw.githubusercontent.com/Sudo-vishal/sudo-voice/main/website/public/releases/latest-windows.json",
];

function newer(a, b) {
  // true if a > b (semver-ish)
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

async function check(currentVersion) {
  for (const url of MANIFEST_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const m = await res.json();
      if (!m.version) continue;
      return {
        current: currentVersion,
        latest: m.version,
        updateAvailable: newer(m.version, currentVersion),
        downloadURL: m.downloadURL ||
          "https://github.com/Sudo-vishal/SudoVoice/releases/latest",
        releaseNotes: m.releaseNotes || "",
        sha256: m.sha256 || "",
      };
    } catch { /* try next source */ }
  }
  return { current: currentVersion, latest: currentVersion, updateAvailable: false, downloadURL: "" };
}

// Download the installer, hash-verifying against the manifest. Returns the
// exe path. dir is injectable for tests; defaults to the OS temp dir.
async function downloadInstaller({ downloadURL, latest, sha256 }, onProgress = () => {}, dir) {
  dir = dir || require("electron").app.getPath("temp");
  const dest = path.join(dir, `SudoVoice-Setup-${latest}.exe`);
  const res = await fetch(downloadURL);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${dest}.part`;
  const out = fs.createWriteStream(tmp);
  const hash = crypto.createHash("sha256");
  let done = 0, lastPct = -1;
  for await (const chunk of res.body) {
    out.write(chunk);
    hash.update(chunk);
    done += chunk.length;
    if (total) {
      const pct = Math.floor((done / total) * 100);
      if (pct !== lastPct) { lastPct = pct; onProgress(`downloading update ${pct}%`); }
    }
  }
  await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
  const digest = hash.digest("hex");
  if (sha256 && digest.toLowerCase() !== sha256.toLowerCase()) {
    fs.unlink(tmp, () => {});
    throw new Error("installer failed integrity check");
  }
  fs.renameSync(tmp, dest);
  return dest;
}

// Launch the NSIS one-click installer silently; --force-run relaunches the
// app when it finishes (electron-builder template arg). Caller must app.quit()
// right after so the installer can replace our files.
function runInstaller(installerPath) {
  spawn(installerPath, ["/S", "--force-run"], { detached: true, stdio: "ignore" }).unref();
}

module.exports = { check, downloadInstaller, runInstaller };
