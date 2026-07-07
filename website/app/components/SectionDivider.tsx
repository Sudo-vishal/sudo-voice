/* Mono section label with hairlines — replaces the old gradient divider.
   Renders like:  ────── // 03 · features ────── */
export default function SectionDivider({
  index,
  label,
}: {
  index?: string;
  label?: string;
}) {
  if (!label) {
    return <div className="h-px w-full bg-[#1C2940]" />;
  }
  return (
    <div className="flex items-center gap-4 max-w-6xl mx-auto px-6">
      <div className="h-px flex-1 bg-[#1C2940]" />
      <span className="font-mono text-xs text-[#5C6E8A] whitespace-nowrap">
        {"// "}
        {index && <span className="text-[#00E676]">{index}</span>}
        {index && " · "}
        {label}
      </span>
      <div className="h-px flex-1 bg-[#1C2940]" />
    </div>
  );
}
