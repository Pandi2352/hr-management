
export function SidebarIllustration({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="200" height="120" rx="12" fill="url(#ill-grad)" />
      <circle cx="50" cy="60" r="28" fill="#4338ca" opacity="0.3" />
      <circle cx="150" cy="60" r="36" fill="#6366f1" opacity="0.25" />
      <rect x="35" y="45" width="30" height="30" rx="6" fill="#818cf8" opacity="0.8" />
      <rect x="75" y="48" width="55" height="10" rx="5" fill="#c7d2fe" />
      <rect x="75" y="64" width="35" height="8" rx="4" fill="#a5b4fc" opacity="0.6" />
      <defs>
        <linearGradient id="ill-grad" x1="0" y1="0" x2="200" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#312e81" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>
    </svg>
  );
}
