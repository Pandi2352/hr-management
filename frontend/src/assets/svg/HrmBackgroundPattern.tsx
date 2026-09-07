
export function HrmBackgroundPattern({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <pattern id="hrm-grid-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="2 4" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#hrm-grid-pattern)" />

      {/* Floating Abstract HR Elements: Team Nodes */}
      <g opacity="0.35">
        {/* Node 1: Top Right */}
        <circle cx="680" cy="120" r="32" fill="#e0e7ff" />
        <circle cx="680" cy="120" r="14" fill="#6366f1" />
        <path d="M680 152v60" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />

        {/* Node 2: Bottom Left */}
        <circle cx="120" cy="650" r="40" fill="#ecfdf5" />
        <circle cx="120" cy="650" r="18" fill="#10b981" />
        <path d="M160 650h60" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />

        {/* Node 3: Calendar check icon */}
        <rect x="620" y="580" width="70" height="70" rx="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
        <rect x="620" y="580" width="70" height="20" rx="10" fill="#e0e7ff" />
        <path d="M645 625l7 7 15-15" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Node 4: ID Badge */}
        <rect x="90" y="140" width="64" height="84" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
        <circle cx="122" cy="170" r="10" fill="#e2e8f0" />
        <rect x="104" y="190" width="36" height="5" rx="2.5" fill="#cbd5e1" />
        <rect x="110" y="200" width="24" height="4" rx="2" fill="#e2e8f0" />
      </g>
    </svg>
  );
}
