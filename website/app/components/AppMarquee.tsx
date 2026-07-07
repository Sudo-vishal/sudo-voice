/* Ticker of environments SudoVoice types into. Duplicated once for the
   seamless -50% translate loop. */
const APPS = [
  "VS Code", "Slack", "Chrome", "Terminal", "Notion", "Gmail", "Cursor",
  "WhatsApp", "Figma", "Obsidian", "Discord", "Linear", "Xcode", "Word",
];

export default function AppMarquee() {
  const row = APPS.map((app) => (
    <span key={app} className="flex items-center gap-3.5 shrink-0">
      <span className="w-1 h-1 rounded-full bg-[#00E676]/60" />
      <span className="font-mono text-sm text-[#5C6E8A] whitespace-nowrap">{app}</span>
    </span>
  ));
  return (
    <div className="py-8 border-y border-[#101A2E]">
      <div className="text-center font-mono text-[11px] tracking-[0.25em] text-[#3D4E6B] uppercase mb-5">
        types into every app you already use
      </div>
      <div className="marquee">
        <div className="marquee-track">
          {row}
          {APPS.map((app) => (
            <span key={`${app}-b`} className="flex items-center gap-3.5 shrink-0" aria-hidden="true">
              <span className="w-1 h-1 rounded-full bg-[#00E676]/60" />
              <span className="font-mono text-sm text-[#5C6E8A] whitespace-nowrap">{app}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
