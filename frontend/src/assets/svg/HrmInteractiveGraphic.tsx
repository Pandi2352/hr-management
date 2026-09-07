
export function HrmInteractiveGraphic() {
  return (
    <div className="relative w-full rounded-md border border-indigo-100/80 bg-white/90 p-5 backdrop-blur-xs">
      {/* Top Header / Status bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-800">Organization Live Mesh</span>
        </div>
        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-100">
          Sync Active
        </span>
      </div>

      {/* Interactive SVG Flow Diagram */}
      <div className="py-4">
        <svg viewBox="0 0 360 170" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          {/* Subtle Grid dots */}
          <pattern id="dot-mesh" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.9" fill="#cbd5e1" opacity="0.6" />
          </pattern>
          <rect width="360" height="170" fill="url(#dot-mesh)" />

          {/* Central Root Node: Super Admin / Org HQ */}
          <rect x="110" y="8" width="140" height="38" rx="6" fill="#4f46e5" />
          <text x="180" y="27" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700" fontFamily="sans-serif">
            PeopleOS Executive
          </text>
          <text x="180" y="38" textAnchor="middle" fill="#c7d2fe" fontSize="9" fontFamily="sans-serif">
            Root Authority & Access
          </text>

          {/* Curved Dynamic Connectors */}
          <path d="M140 46 C 140 75, 55 60, 55 90" stroke="#818cf8" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M180 46 V 90" stroke="#6366f1" strokeWidth="2" />
          <path d="M220 46 C 220 75, 305 60, 305 90" stroke="#818cf8" strokeWidth="2" strokeDasharray="3 3" />

          {/* Child Node 1: Talent & Operations */}
          <rect x="10" y="90" width="95" height="42" rx="6" fill="#ffffff" stroke="#e0e7ff" strokeWidth="1.5" />
          <text x="57" y="108" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="700" fontFamily="sans-serif">
            Operations
          </text>
          <text x="57" y="122" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="600" fontFamily="sans-serif">
            ✓ 100% Policy
          </text>

          {/* Child Node 2: Employee Hub */}
          <rect x="130" y="90" width="100" height="42" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          <text x="180" y="108" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="700" fontFamily="sans-serif">
            Staff Directory
          </text>
          <text x="180" y="122" textAnchor="middle" fill="#6366f1" fontSize="9" fontWeight="600" fontFamily="sans-serif">
            Realtime Tree
          </text>

          {/* Child Node 3: Approvals & Payroll */}
          <rect x="255" y="90" width="95" height="42" rx="6" fill="#ffffff" stroke="#e0e7ff" strokeWidth="1.5" />
          <text x="302" y="108" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="700" fontFamily="sans-serif">
            Approvals
          </text>
          <text x="302" y="122" textAnchor="middle" fill="#8b5cf6" fontSize="9" fontWeight="600" fontFamily="sans-serif">
            Multi-tier
          </text>

          {/* Pulsing indicator dots */}
          <circle cx="55" cy="90" r="3" fill="#10b981" />
          <circle cx="180" cy="90" r="3" fill="#6366f1" />
          <circle cx="305" cy="90" r="3" fill="#8b5cf6" />
        </svg>
      </div>

      {/* Floating Micro-Pill Metatags */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
        <span className="font-mono">Cluster: us-east-core</span>
        <span className="text-indigo-600 font-semibold">Latency: 18ms</span>
      </div>
    </div>
  );
}
