/* Ticker of environments SudoVoice types into — boxed tiles, duplicated
   once for the seamless -50% translate loop. */
const APPS = [
  "VS Code", "Slack", "Chrome", "Terminal", "Notion", "Gmail", "Cursor",
  "WhatsApp", "Figma", "Obsidian", "Discord", "Linear", "Xcode", "Word",
];

function Tile({ app }: { app: string }) {
  return (
    <span className="flex items-center gap-2.5 shrink-0 px-5 py-2.5 rounded-lg border border-[#16233D] bg-[#080F1D]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#00E676]/70" />
      <span className="font-mono text-sm text-[#8FA3BF] whitespace-nowrap">{app}</span>
    </span>
  );
}

export default function AppMarquee() {
  return (
    <div className="py-9 border-y border-[#101A2E]">
      <div className="text-center font-mono text-[11px] tracking-[0.25em] text-[#3D4E6B] uppercase mb-6">
        ● types into the apps you already use
      </div>
      <div className="marquee">
        <div className="marquee-track">
          {APPS.map((app) => (
            <Tile key={app} app={app} />
          ))}
          {APPS.map((app) => (
            <span key={`${app}-b`} aria-hidden="true">
              <Tile app={app} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
