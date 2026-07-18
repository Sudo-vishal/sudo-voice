// Smart punctuation — port of the Mac SmartPunctuationService.
// Deterministic spoken-token replacement, used as the baseline when AI cleanup
// is off or fails. attachToPrevious means the mark hugs the preceding word.
const RULES = [ // longest patterns first so "new paragraph" wins over "new line" etc.
  { pattern: "new paragraph", repl: "\n\n", attach: false },
  { pattern: "exclamation point", repl: "!", attach: true },
  { pattern: "exclamation mark", repl: "!", attach: true },
  { pattern: "open parenthesis", repl: "(", attach: false },
  { pattern: "close parenthesis", repl: ")", attach: true },
  { pattern: "question mark", repl: "?", attach: true },
  { pattern: "open bracket", repl: "[", attach: false },
  { pattern: "close bracket", repl: "]", attach: true },
  { pattern: "open quote", repl: "\"", attach: false },
  { pattern: "close quote", repl: "\"", attach: true },
  { pattern: "open paren", repl: "(", attach: false },
  { pattern: "close paren", repl: ")", attach: true },
  { pattern: "full stop", repl: ".", attach: true },
  { pattern: "semicolon", repl: ";", attach: true },
  { pattern: "new line", repl: "\n", attach: false },
  { pattern: "ellipsis", repl: "...", attach: true },
  { pattern: "period", repl: ".", attach: true },
  { pattern: "comma", repl: ",", attach: true },
  { pattern: "hyphen", repl: "-", attach: false },
  { pattern: "colon", repl: ":", attach: true },
  { pattern: "dash", repl: "—", attach: false },
];

function apply(text) {
  let out = text;
  for (const { pattern, repl, attach } of RULES) {
    const re = new RegExp(`\\s*\\b${pattern.replace(/ /g, "\\s+")}\\b\\s*`, "gi");
    const replacement = repl.includes("\n") ? repl : attach ? `${repl} ` : ` ${repl}`;
    out = out.replace(re, replacement);
  }
  return out.replace(/ {2,}/g, " ").trim();
}

module.exports = { apply };
