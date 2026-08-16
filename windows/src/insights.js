// Local dictation insights — words, WPM, streak, weekly chart, recent list.
// Windows counterpart of the Mac Home tab's InsightsCalculator. Everything is
// stored locally in userData/insights.json; cloud sync is separate (supabase.js).
const fs = require("fs");
const path = require("path");

const MAX_ENTRIES = 5000;
let cache = null;

function file() {
  const { app } = require("electron");
  return path.join(app.getPath("userData"), "insights.json");
}

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(file(), "utf8"));
    if (!Array.isArray(cache)) cache = [];
  } catch {
    cache = [];
  }
  return cache;
}

function save() {
  try {
    fs.writeFileSync(file(), JSON.stringify(cache));
  } catch (err) {
    console.error("insights save failed:", err.message);
  }
}

/** Record one completed dictation. */
function record({ words, chars, seconds, preview }) {
  const entries = load();
  entries.push({ ts: Date.now(), words, chars, seconds, preview });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  save();
}

const dayKey = (ts) => new Date(ts).toISOString().slice(0, 10);
const localDayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/** Aggregate stats for the settings UI. */
function summary() {
  const entries = load();
  const now = new Date();
  const todayKey = localDayKey(now);

  // Per-local-day word totals.
  const byDay = new Map();
  for (const e of entries) {
    const k = localDayKey(e.ts);
    byDay.set(k, (byDay.get(k) || 0) + (e.words || 0));
  }

  // Streak: consecutive days with activity, counting back from today
  // (a streak survives until a full day is missed — yesterday keeps it alive).
  let streak = 0;
  const probe = new Date(now);
  if (!byDay.has(todayKey)) probe.setDate(probe.getDate() - 1);
  while (byDay.has(localDayKey(probe))) {
    streak++;
    probe.setDate(probe.getDate() - 1);
  }

  // Average WPM over the last 30 days of voiced time.
  const cutoff = now.getTime() - 30 * 86400000;
  let w30 = 0, s30 = 0;
  for (const e of entries) {
    if (e.ts >= cutoff && e.seconds > 0.5) { w30 += e.words || 0; s30 += e.seconds; }
  }
  const wpm = s30 > 0 ? Math.round(w30 / (s30 / 60)) : 0;

  // Last 7 local days, oldest first, for the mini chart.
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = localDayKey(d);
    week.push({ day: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()], words: byDay.get(k) || 0 });
  }

  const recent = entries.slice(-5).reverse().map((e) => ({
    ts: e.ts, words: e.words || 0, preview: e.preview || "",
  }));

  return {
    todayWords: byDay.get(todayKey) || 0,
    totalWords: entries.reduce((n, e) => n + (e.words || 0), 0),
    totalDictations: entries.length,
    wpm,
    streak,
    week,
    recent,
  };
}

module.exports = { record, summary, dayKey };
