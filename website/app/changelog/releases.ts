export type Release = {
  version: string;
  date: string; // ISO date, or "" when the range spans multiple releases
  title: string;
  notes: string[];
  latest?: boolean;
};

export const releases: Release[] = [
  {
    version: "v2.6.0",
    date: "2026-07-12",
    title: "Windows app launch",
    latest: true,
    notes: [
      "Windows desktop app ships: Electron + whisper.cpp, global push-to-talk on Right Ctrl, types at your cursor in any app, lives in the system tray. Windows 10/11 x64.",
      "CI-built installers for all platforms — Windows NSIS .exe, macOS .dmg, Android .apk — published as stable GitHub Release assets.",
      "Terminal-native brand rolled out across every surface: apps, installers, website, docs.",
    ],
  },
  {
    version: "v2.5.x",
    date: "",
    title: "Wispr-class latency",
    notes: [
      "Streaming partials: words land at your cursor while you are still speaking.",
      "Aggressive endpointing — release the key and the tail of your sentence is already typed.",
    ],
  },
  {
    version: "v2.0",
    date: "",
    title: "AI cleanup pipeline",
    notes: [
      "LLM cleanup pipeline: fillers stripped, grammar fixed, before the text lands.",
      "Floating indicator shows listening / transcribing / typing state at a glance.",
    ],
  },
];
