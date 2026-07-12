// Update check against the SudoVoice release manifest. Domain first, GitHub
// raw as fallback while sudovoice.com is not yet live.
const MANIFEST_URLS = [
  "https://sudovoice.com/releases/latest-windows.json",
  "https://raw.githubusercontent.com/Sudo-vishal/SudoVoice/main/website/public/releases/latest-windows.json",
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
      };
    } catch { /* try next source */ }
  }
  return { current: currentVersion, latest: currentVersion, updateAvailable: false, downloadURL: "" };
}

module.exports = { check };
