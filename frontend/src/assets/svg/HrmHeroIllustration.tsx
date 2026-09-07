
export function HrmHeroIllustration({ className = "w-full h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Subtle Accent Grid */}
      <pattern id="hrm-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="#e2e8f0" />
      </pattern>
      <rect width="520" height="320" rx="16" fill="#f8fafc" />
      <rect width="520" height="320" rx="16" fill="url(#hrm-grid)" opacity="0.7" />

      {/* Main Central Card: Team Org Hierarchy */}
      <rect x="180" y="30" width="160" height="52" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <circle cx="206" cy="56" r="14" fill="#4f46e5" />
      <path d="M201 54a5 5 0 1110 0v2h-10v-2z" fill="#ffffff" />
      <circle cx="206" cy="51" r="3" fill="#ffffff" />
      <rect x="228" y="48" width="80" height="7" rx="3.5" fill="#0f172a" />
      <rect x="228" y="59" width="55" height="5" rx="2.5" fill="#64748b" />

      {/* Connection Lines */}
      <path d="M260 82v30" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M120 112h280" stroke="#cbd5e1" strokeWidth="2" />
      <path d="M120 112v20" stroke="#cbd5e1" strokeWidth="2" />
      <path d="M400 112v20" stroke="#cbd5e1" strokeWidth="2" />

      {/* Team Member Node 1: Engineering Lead */}
      <rect x="40" y="132" width="160" height="52" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <circle cx="66" cy="158" r="14" fill="#10b981" />
      <rect x="88" y="150" width="80" height="7" rx="3.5" fill="#0f172a" />
      <rect x="88" y="161" width="60" height="5" rx="2.5" fill="#64748b" />

      {/* Team Member Node 2: Product & Talent */}
      <rect x="320" y="132" width="160" height="52" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <circle cx="346" cy="158" r="14" fill="#8b5cf6" />
      <rect x="368" y="150" width="80" height="7" rx="3.5" fill="#0f172a" />
      <rect x="368" y="161" width="50" height="5" rx="2.5" fill="#64748b" />

      {/* Floating HR Metric Card 1: Attendance Pulse */}
      <rect x="30" y="210" width="190" height="75" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <circle cx="56" cy="245" r="12" fill="#e0e7ff" />
      <path d="M52 245l3 3 6-6" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="78" y="235" width="70" height="6" rx="3" fill="#64748b" />
      <rect x="78" y="246" width="110" height="8" rx="4" fill="#0f172a" />
      <rect x="78" y="260" width="85" height="5" rx="2.5" fill="#10b981" />

      {/* Floating HR Metric Card 2: Headcount Growth */}
      <rect x="250" y="210" width="240" height="75" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
      <circle cx="276" cy="245" r="12" fill="#ecfdf5" />
      <path d="M272 248l4-6 4 3 4-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="298" y="235" width="85" height="6" rx="3" fill="#64748b" />
      <rect x="298" y="246" width="130" height="8" rx="4" fill="#0f172a" />
      <rect x="298" y="260" width="75" height="5" rx="2.5" fill="#6366f1" />
    </svg>
  );
}
