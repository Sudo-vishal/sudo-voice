"use client";

import { useEffect, useState } from "react";
import { DOWNLOADS, type OSKey } from "@/app/lib/downloads";

/* OS-aware download CTA. Detects the visitor's platform on the client
   (SSR defaults to macOS) and points the primary button at the right
   GitHub Release asset, with the other platforms as secondary links. */

function detectOS(): OSKey {
  if (typeof navigator === "undefined") return "macos";
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = (
    nav.userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent ||
    ""
  ).toLowerCase();
  const ua = (navigator.userAgent || "").toLowerCase();

  if (ua.includes("android") || platform.includes("android")) return "android";
  if (platform.includes("win") || ua.includes("windows")) return "windows";
  if (
    platform.includes("mac") ||
    ua.includes("mac os") ||
    ua.includes("iphone") ||
    ua.includes("ipad")
  )
    return "macos";
  // Linux and everything else: desktop-first fallback
  return "macos";
}

export default function OSDownload({
  align = "start",
}: {
  align?: "start" | "center";
}) {
  const [os, setOs] = useState<OSKey>("macos");

  useEffect(() => {
    setOs(detectOS());
  }, []);

  const primary = DOWNLOADS[os];
  const others = (Object.keys(DOWNLOADS) as OSKey[]).filter((k) => k !== os);

  return (
    <div className={align === "center" ? "flex flex-col items-center" : "flex flex-col items-start"}>
      <a href={primary.href} className="btn-primary px-8 py-4 text-base">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
          <path d="M4 19h16" />
        </svg>
        Download for {primary.label}
      </a>
      <div
        className={`mt-3 font-mono text-[12px] text-[#5C6E8A] ${
          align === "center" ? "text-center" : ""
        }`}
      >
        also for{" "}
        {others.map((k, i) => (
          <span key={k}>
            <a
              href={DOWNLOADS[k].href}
              className="text-[#8FA3BF] hover:text-[#00E676] underline decoration-[#1C2940] underline-offset-4 transition-colors"
            >
              {DOWNLOADS[k].label.toLowerCase()} ({DOWNLOADS[k].file})
            </a>
            {i < others.length - 1 && <span> · </span>}
          </span>
        ))}
      </div>
    </div>
  );
}
