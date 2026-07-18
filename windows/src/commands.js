// Voice commands — port of the Mac VoiceCommandService semantics.
// detect() runs on the RAW whisper chunk text, before cleanup. Returns a
// command id or null. Matching is deliberately conservative: "stop" and
// "press enter" fire only as the whole utterance ("stop" is too common a word
// to allow prefix/suffix matching).
const PHRASES = {
  scratchThat: ["scratch that", "scratch this", "undo that", "undo this",
    "delete that", "delete this", "remove that", "remove this",
    "never mind", "nevermind"],
  deleteWord: ["delete word", "delete last word", "backspace", "back space"],
  clearAll: ["clear all", "clear everything", "delete all", "delete everything",
    "start over", "erase all"],
  copy: ["copy", "copy that", "copy this", "copy it", "copy all",
    "copied", "copied that", "copies that"],
  paste: ["paste", "paste here", "paste it", "paste this", "pasted", "pasted here"],
  cut: ["cut", "cut that", "cut this", "cut it"],
  stopDictation: ["stop", "stop recording", "stop listening", "stop now",
    "i'm done", "im done", "that's it", "thats it"],
  selectAll: ["select all", "select everything", "highlight all", "highlight everything"],
  pressEnter: ["press enter", "hit enter", "press return", "hit return",
    "new line", "next line", "enter"],
};

const PREFIX_OK = ["scratchThat", "clearAll", "copy", "paste", "cut"];
const CONTAINS_OK = ["scratchThat", "deleteWord", "clearAll", "copy", "paste", "cut"];

function normalize(text) {
  return text.trim().toLowerCase().replace(/[.,!?]/g, "").trim();
}

function detect(rawText) {
  const n = normalize(rawText || "");
  if (!n) return null;

  // Tier 1: exact match — any command.
  for (const [cmd, phrases] of Object.entries(PHRASES)) {
    if (phrases.includes(n)) return cmd;
  }
  // Tier 2: prefix match with a little trailing slack ("scratch that please").
  for (const cmd of PREFIX_OK) {
    for (const p of PHRASES[cmd]) {
      if (n.startsWith(p) && n.length < p.length + 10) return cmd;
    }
  }
  // Tier 3: suffix/contains, only for short utterances.
  if (n.length < 40) {
    for (const cmd of CONTAINS_OK) {
      for (const p of PHRASES[cmd]) {
        if (n.endsWith(p) || n.includes(p)) return cmd;
      }
    }
    for (const p of PHRASES.selectAll) {
      if (n.endsWith(p)) return "selectAll";
    }
  }
  return null;
}

module.exports = { detect, normalize };
