// Fast unit tests for the deterministic dictation logic (no audio, no network).
// Run: npm run test:units
const assert = require("assert");
const commands = require("../src/commands");
const punctuation = require("../src/punctuation");

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
console.log("PASS — all unit cases");
