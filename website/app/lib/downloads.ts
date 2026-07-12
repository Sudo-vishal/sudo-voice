/* Stable GitHub Release asset URLs — single source of truth for every
   download CTA on the site. */

export type OSKey = "windows" | "macos" | "android";

export const DOWNLOADS: Record<
  OSKey,
  { label: string; file: string; href: string }
> = {
  windows: {
    label: "Windows",
    file: ".exe",
    href: "https://github.com/Sudo-vishal/SudoVoice/releases/latest/download/SudoVoice-Setup.exe",
  },
  macos: {
    label: "macOS",
    file: ".dmg",
    href: "https://github.com/Sudo-vishal/SudoVoice/releases/latest/download/SudoVoice.dmg",
  },
  android: {
    label: "Android",
    file: ".apk",
    href: "https://github.com/Sudo-vishal/SudoVoice/releases/latest/download/SudoVoice.apk",
  },
};
