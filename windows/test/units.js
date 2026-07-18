// Fast unit tests for the deterministic dictation logic (no audio, no real
// network — the update test uses a loopback HTTP server).
// Run: npm run test:units
const assert = require("assert");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const commands = require("../src/commands");
const punctuation = require("../src/punctuation");
const updates = require("../src/updates");

// ---- voice command detection (Mac VoiceCommandService parity) --------------
const cases = [
  // exact matches, with whisper-style casing/punctuation
  ["Stop.", "stopDictation"],
  ["stop recording", "stopDictation"],
  ["I'm done.", "stopDictation"],
  ["Scratch that.", "scratchThat"],
  ["Never mind!", "scratchThat"],
  ["Delete word", "deleteWord"],
  ["Backspace.", "deleteWord"],
  ["Clear all.", "clearAll"],
  ["Start over.", "clearAll"],
  ["Select all.", "selectAll"],
  ["Highlight everything", "selectAll"],
  ["Press enter.", "pressEnter"],
  ["New line.", "pressEnter"],
  ["Enter.", "pressEnter"],
  ["Copy that.", "copy"],
  ["Paste here.", "paste"],
  ["Cut this.", "cut"],
  // prefix slack ("scratch that please")
  ["Scratch that please.", "scratchThat"],
  ["Clear all now", "clearAll"],
  // suffix for selectAll only
  ["please select all", "selectAll"],
  // negatives: command words inside real sentences must NOT fire
  ["Stop the car before the light.", null],
  ["We should start a new line of products.", null],
  ["Press enter to submit the form after you finish typing everything.", null],
  ["Select all the files in that folder and archive them somewhere safe.", null],
  ["This is a completely normal sentence.", null],
  ["", null],
];
for (const [input, expected] of cases) {
  assert.strictEqual(commands.detect(input), expected, `detect(${JSON.stringify(input)})`);
}
console.log(`commands: ${cases.length} cases OK`);

// ---- smart punctuation (Mac SmartPunctuationService parity) ----------------
const pcases = [
  ["hello comma world period", "hello, world."],
  ["is it working question mark", "is it working?"],
  ["first item new line second item", "first item\nsecond item"],
  ["one section new paragraph next section", "one section\n\nnext section"],
  ["wait open quote hi close quote done", 'wait "hi" done'],
  ["a colon b semicolon c", "a: b; c"],
  ["so full stop that's it exclamation mark", "so. that's it!"],
  ["no tokens here at all", "no tokens here at all"],
  ["the comma key", "the, key"], // greedy by design, matches Mac behavior
];
for (const [input, expected] of pcases) {
  assert.strictEqual(punctuation.apply(input), expected, `apply(${JSON.stringify(input)})`);
}
console.log(`punctuation: ${pcases.length} cases OK`);

// ---- self-update download + sha256 integrity (loopback server) -------------
(async () => {
  const payload = crypto.randomBytes(300000);
  const goodSha = crypto.createHash("sha256").update(payload).digest("hex");
  const srv = http.createServer((_req, res) => {
    res.setHeader("content-length", payload.length);
    res.end(payload);
  });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${srv.address().port}/SudoVoice-Setup.exe`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sv-update-test-"));

  const exe = await updates.downloadInstaller(
    { downloadURL: url, latest: "9.9.9", sha256: goodSha }, () => {}, dir);
  assert.ok(fs.existsSync(exe), "verified download must land");
  assert.strictEqual(fs.statSync(exe).size, payload.length, "size must match");

  let threw = false;
  try {
    await updates.downloadInstaller(
      { downloadURL: url, latest: "9.9.8", sha256: "0".repeat(64) }, () => {}, dir);
  } catch (err) {
    threw = /integrity/.test(err.message);
  }
  assert.ok(threw, "tampered sha must throw an integrity error");
  assert.ok(!fs.existsSync(path.join(dir, "SudoVoice-Setup-9.9.8.exe")), "bad exe must not persist");
  srv.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("updates: download + integrity OK");
  console.log("PASS — all unit cases");
})().catch((err) => { console.error("FAIL:", err.message); process.exit(1); });
