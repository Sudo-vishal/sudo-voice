export default function AmbientGlow({
  position = "center",
  color = "purple",
  size = 500,
}: {
  position?: "center" | "top-right" | "bottom-left" | "top-left" | "bottom-right";
  color?: "purple" | "blue" | "pink";
  size?: number;
}) {
  const colorMap = {
    purple: "rgba(79, 195, 247, 0.07)",
    blue: "rgba(0, 230, 118, 0.07)",
    pink: "rgba(0, 230, 118, 0.06)",
  };

  const positionMap = {
    center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    "top-right": { top: "-80px", right: "-80px", transform: "none" },
    "bottom-left": { bottom: "-80px", left: "-80px", transform: "none" },
    "top-left": { top: "-80px", left: "-80px", transform: "none" },
    "bottom-right": { bottom: "-80px", right: "-80px", transform: "none" },
  };

  return (
    <div
      className="absolute pointer-events-none z-0"
      style={{
        ...positionMap[position],
        width: size,
        height: size,
        background: `radial-gradient(circle, ${colorMap[color]} 0%, transparent 70%)`,
      }}
    />
  );
}
