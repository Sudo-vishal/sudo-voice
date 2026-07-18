// Types text at the current cursor position in whatever app has focus.
// Strategy: clipboard + Ctrl+V paste (reliable across apps, IME-safe, fast for
// long text), then restore the user's previous clipboard.
const { clipboard } = require("electron");
const { execFile } = require("child_process");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// keys uses WScript SendKeys syntax, e.g. "^v", "^a", "{ENTER}", "{BS 12}".
function sendKeys(keys) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command",
        `(New-Object -ComObject WScript.Shell).SendKeys('${keys}')`],
      { timeout: 10000 },
      (err) => (err ? reject(err) : resolve())
    );
  });
}

async function typeText(text) {
  if (!text) return;
  const prev = clipboard.readText();
  clipboard.writeText(text);
  await sleep(50);          // let the clipboard settle before pasting
  await sendKeys("^v");
  await sleep(300);         // let the target app read the clipboard
  if (prev) clipboard.writeText(prev);
}

module.exports = { typeText, sendKeys };
