/**
 * Background motifs for the careers bands.
 *
 * House rules, so six animations on one page stay cheap and calm:
 *  - animate `transform` / `opacity` only — never layout properties;
 *  - draw with `currentColor`, so one text utility themes light and dark;
 *  - keep every cycle slow enough to read as ambient, not as a demand for
 *    attention.
 *
 * The globe lives in GlobalScaleSection and the radar in RadarMotif; these are
 * the remaining three.
 */

/** Perspective grid sliding toward the horizon — What We Do. */
export function GridDriftMotif({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`careers-grid-drift ${className}`}>
      <div className="careers-grid-drift-plane" />
    </div>
  );
}

/** Stacked sine bands easing left and right out of phase — Locations. */
export function WaveMotif({ className = '' }: { className?: string }) {
  const bands = [0, 1, 2, 3];
  return (
    <div aria-hidden className={`careers-wave ${className}`}>
      {bands.map((i) => (
        <svg
          key={i}
          className="careers-wave-band"
          style={{ animationDelay: `${i * -3.5}s`, opacity: 0.5 - i * 0.09, top: `${18 + i * 18}%` }}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          {/* Two periods, so the -50% translate loops seamlessly. */}
          <path
            d="M0 60 Q 150 0 300 60 T 600 60 T 900 60 T 1200 60"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ))}
    </div>
  );
}

/** Slow drifting colour fields — Open roles. */
export function AuroraMotif({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`careers-aurora ${className}`}>
      <span className="careers-aurora-blob careers-aurora-blob-1" />
      <span className="careers-aurora-blob careers-aurora-blob-2" />
      <span className="careers-aurora-blob careers-aurora-blob-3" />
    </div>
  );
}

/** Motes rising through the band — Culture & perks. */
const MOTES = [
  { left: 6, delay: 0, duration: 17, size: 4 },
  { left: 17, delay: 4.5, duration: 22, size: 3 },
  { left: 29, delay: 9, duration: 19, size: 5 },
  { left: 41, delay: 2.2, duration: 25, size: 3 },
  { left: 53, delay: 12, duration: 18, size: 4 },
  { left: 64, delay: 6.5, duration: 23, size: 3 },
  { left: 76, delay: 15, duration: 20, size: 5 },
  { left: 88, delay: 1.4, duration: 26, size: 3 },
  { left: 95, delay: 8, duration: 21, size: 4 },
];

export function MoteFieldMotif({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`careers-motes ${className}`}>
      {MOTES.map((mote) => (
        <span
          key={mote.left}
          className="careers-mote"
          style={{
            left: `${mote.left}%`,
            height: `${mote.size}px`,
            width: `${mote.size}px`,
            animationDelay: `${-mote.delay}s`,
            animationDuration: `${mote.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
