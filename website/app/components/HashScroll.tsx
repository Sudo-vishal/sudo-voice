"use client";

import { useEffect } from "react";

/**
 * Tiny mount-time scroller. If the page loads with a hash that matches
 * a known id, smooth-scroll that element into view after hydration.
 * Used by /pricing to honor /pricing#lifetime from the Mac app's
 * UpgradeSheet "Get Lifetime $249" button.
 */
export default function HashScroll({ ids }: { ids: readonly string[] }) {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !ids.includes(hash)) return;
    const el = document.getElementById(hash);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [ids]);
  return null;
}
