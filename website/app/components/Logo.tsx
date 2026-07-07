export default function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0B1526" stroke="#1C2940" />
      <path
        d="M7.5 10.5 L13.5 16 L7.5 21.5"
        stroke="#00E676"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="16.5" y="12.5" width="2.6" height="7" rx="1.3" fill="#4FC3F7" />
      <rect x="20.6" y="9.5" width="2.6" height="13" rx="1.3" fill="#4FC3F7" />
      <rect x="24.7" y="13.5" width="2.6" height="5" rx="1.3" fill="#4FC3F7" />
    </svg>
  );
}

export function Wordmark({ className = "text-lg" }: { className?: string }) {
  return (
    <span className={`font-mono font-semibold tracking-tight ${className}`}>
      <span className="text-emerald-400">sudo</span>
      <span className="text-white">voice</span>
    </span>
  );
}
