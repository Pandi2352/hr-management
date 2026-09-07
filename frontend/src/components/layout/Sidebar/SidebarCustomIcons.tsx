// 1. Search Icon (Refined thin stroke 1.6)
export function SearchNavIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#2b3648" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10" cy="10" r="6.2" />
      <path d="m14.5 14.5 5 5" strokeWidth="1.8" />
    </svg>
  );
}

// 2. Calendar (Refined stroke 1.5, blue tone)
export function CalendarNavIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#1d5bb3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3.5" y="4" width="17" height="16.5" rx="2" />
      <path d="M3.5 8.5h17" />
      <path d="M8 2.2v3" />
      <path d="M16 2.2v3" />
      {/* Grid lines inside */}
      <path d="M9 8.5v12" strokeWidth="1.2" />
      <path d="M15 8.5v12" strokeWidth="1.2" />
      <path d="M3.5 12.5h17" strokeWidth="1.2" />
      <path d="M3.5 16.5h17" strokeWidth="1.2" />
    </svg>
  );
}

// 3. ID Badge Card (Refined stroke 1.5)
export function BadgeCardNavIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#2b3648" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      {/* Top blue accent bar */}
      <path d="M2.5 8h19" stroke="#1d5bb3" strokeWidth="1.6" />
      {/* Left avatar photo */}
      <circle cx="7" cy="12" r="1.5" fill="#2b3648" />
      <path d="M5 16a2 2 0 0 1 4 0" fill="#2b3648" />
      {/* Right credential text bars */}
      <line x1="12" y1="11" x2="18.5" y2="11" strokeWidth="1.5" />
      <line x1="12" y1="14" x2="18.5" y2="14" strokeWidth="1.5" />
    </svg>
  );
}

// 4. Speech Chat Bubble (Refined stroke 1.5)
export function ChatNavIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* Back solid shadow bubble */}
      <path
        d="M19 14c0 2.5-2.5 4.5-5.5 4.5-.7 0-1.4-.1-2-.3L8 19.5l1-2.2C7.8 16 7 14.5 7 13c0-.4.1-.9.2-1.3C8.6 13.5 11 14.8 13.8 14.8c3.5 0 5.2-.8 5.2-.8z"
        fill="#1e293b"
      />
      {/* Front outlined bubble */}
      <path
        d="M17 9.5c0-2.8-3-5-7-5S3 6.7 3 9.5c0 1.8 1.1 3.2 2.8 4.2L5 17l3.5-1.2c.5.1 1 .2 1.5.2 4 0 7-2.2 7-5z"
        stroke="#2b3648"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="white"
      />
    </svg>
  );
}

// 5. Folder Icon (Refined stroke 1.5)
export function FolderNavIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#2b3648" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3.5 19.5h17a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-7.5l-2-2.5h-6A1.5 1.5 0 0 0 3.5 6.5v11.5a1.5 1.5 0 0 0 1.5 1.5Z" />
    </svg>
  );
}

// 6. Cog/Settings Gear (Refined stroke 1.6)
export function GearNavIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

// 7. Masked User Profile Avatar
export function MaskUserNavIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <div className={`flex ${className} items-center justify-center rounded-full bg-[#d8e3ed] overflow-hidden`}>
      <svg viewBox="0 0 36 36" fill="currentColor" className="h-6 w-6">
        {/* Dark Hair */}
        <path d="M12 6c2-2 7-2 9 0 2 0 3 2 3 4s-1 3-1 3 1 1 1 3c0 2-1 3-2 4-1 1-2 1-4 1s-3 0-4-1c-1-1-2-2-2-4 0-2 1-3 1-3s-1-1-1-3c0-2 1-4 3-4z" fill="#1e293b" />
        {/* Face */}
        <circle cx="18" cy="16" r="6" fill="#f8fafc" />
        {/* Dark Mask */}
        <rect x="13" y="14" width="10" height="4.5" rx="2" fill="#0f172a" />
        {/* White Glasses highlight dots */}
        <circle cx="15.5" cy="16.2" r="0.8" fill="#ffffff" />
        <circle cx="20.5" cy="16.2" r="0.8" fill="#ffffff" />
        {/* Orange Neck band */}
        <path d="M17 22h2v2h-2z" fill="#f97316" />
        {/* Torso / Dark Shirt */}
        <path d="M10 32c0-4 3.5-7 8-7s8 3 8 7z" fill="#1e293b" />
      </svg>
    </div>
  );
}

// 8. Horizontal 4-bar Menu Toggle (Refined stroke 2.0)
export function HorizontalBarsNavIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#2b3648" strokeWidth="2.1" strokeLinecap="round" className={className}>
      <path d="M4 6.5h16" />
      <path d="M4 10.5h11" />
      <path d="M4 14.5h16" />
      <path d="M4 18.5h8" />
    </svg>
  );
}

// 9. Rocket Icon for HRMS
export function RocketHRMSIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

// 10. Coffee Cup for Project
export function CoffeeProjectIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
  );
}

// 11. Briefcase for Job Portal
export function BriefcaseJobIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  );
}

// 12. Lock for Authentication
export function LockAuthIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// 13. Tag for Icons
export function TagNavIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

// 14. Bar Chart Icon
export function ChartNavIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="4" height="10" x="4" y="10" rx="1" />
      <rect width="4" height="16" x="10" y="4" rx="1" />
      <rect width="4" height="7" x="16" y="13" rx="1" />
    </svg>
  );
}

// 15. Forms Stacked Layers Icon
export function LayersNavIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L3.18 12.5" />
      <path d="m22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L3.18 17.5" />
    </svg>
  );
}

// 16. Tables Icon
export function TableNavIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

// 17. Widgets Puzzle Piece Icon
export function PuzzleNavIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19.439 7.85c-.049-.322.059-.648.289-.878l1.568-1.568a1.5 1.5 0 0 0-2.121-2.121l-1.568 1.568a1.002 1.002 0 0 1-.878.29c-.703-.105-1.424-.105-2.127 0a1.002 1.002 0 0 1-.878-.29L12.155 3.28a1.5 1.5 0 0 0-2.121 2.121l1.568 1.568c.23.23.338.556.289.878a6.978 6.978 0 0 0 0 2.127 1.002 1.002 0 0 1-.29.878l-1.568 1.568a1.5 1.5 0 0 0 2.121 2.121l1.568-1.568c.23-.23.556-.338.878-.289.703.105 1.424.105 2.127 0 .322.049.648-.059.878-.289l1.568-1.568a1.5 1.5 0 0 0-2.121-2.121l-1.568 1.568a1.002 1.002 0 0 1-.878.29c-.703-.105-1.424-.105-2.127 0Z" />
    </svg>
  );
}

// 18. Folded Map Icon
export function MapNavIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </svg>
  );
}

// 19. Gallery Picture Icon
export function GalleryNavIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

// 20. Contacts / Address Book Icon (Refined stroke 1.5 with violet accent)
export function ContactsNavIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* Book cover outline */}
      <rect x="4.5" y="3" width="15.5" height="18" rx="2" stroke="#2b3648" strokeWidth="1.5" />
      {/* Spine binder lines */}
      <line x1="4.5" y1="7" x2="2.5" y2="7" stroke="#1d5bb3" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.5" y1="12" x2="2.5" y2="12" stroke="#1d5bb3" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.5" y1="17" x2="2.5" y2="17" stroke="#1d5bb3" strokeWidth="2" strokeLinecap="round" />
      {/* User silhouette */}
      <circle cx="12" cy="9.5" r="2.2" stroke="#6366f1" strokeWidth="1.5" />
      <path d="M8.5 16.5a3.5 3.5 0 0 1 7 0" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
      {/* Index tabs on the right */}
      <path d="M20 7.5h1.5" stroke="#2b3648" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 11.5h1.5" stroke="#2b3648" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 15.5h1.5" stroke="#2b3648" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

