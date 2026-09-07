/**
 * Radar sweep — the About band's motion.
 *
 * Deliberately a different language from the globe on the scalability band:
 * that one is a solid 3D body turning in place, this one is flat, outward and
 * pulsing. Both animate transform/opacity only, so neither costs layout.
 *
 * Colour comes from `currentColor`, so one text utility on the caller themes
 * the whole motif for light and dark.
 */

/** Expanding rings, staggered so one is always mid-flight. */
const PULSES = [0, 1.6, 3.2, 4.8];

/** Static rings that give the sweep something to read against. */
const GRID_RINGS = [28, 52, 76, 100];

export function RadarMotif({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`careers-radar ${className}`}>
      {GRID_RINGS.map((size) => (
        <span
          key={`g-${size}`}
          className="careers-radar-grid"
          style={{ width: `${size}%`, height: `${size}%` }}
        />
      ))}

      {/* Crosshairs */}
      <span className="careers-radar-axis careers-radar-axis-x" />
      <span className="careers-radar-axis careers-radar-axis-y" />

      {PULSES.map((delay) => (
        <span
          key={`p-${delay}`}
          className="careers-radar-pulse"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}

      {/* Rotating wedge, the part that actually reads as "scanning". */}
      <span className="careers-radar-sweep" />

      <span className="careers-radar-core" />
    </div>
  );
}
