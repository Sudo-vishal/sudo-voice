export default function SectionDivider() {
  return (
    <div
      className="h-px w-full"
      style={{
        background: "linear-gradient(90deg, transparent 0%, rgba(0, 230, 118,0.1) 15%, rgba(79, 195, 247,0.3) 40%, rgba(79, 195, 247,0.4) 50%, rgba(79, 195, 247,0.3) 60%, rgba(0, 230, 118,0.1) 85%, transparent 100%)",
      }}
    />
  );
}
