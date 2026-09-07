import { useMemo } from 'react';

/**
 * Wireframe globe built from CSS 3D rings rather than an image or a canvas
 * library: it stays crisp at any size, costs one compositor-driven transform
 * to animate, and needs no runtime dependency.
 */
const MERIDIAN_COUNT = 14;

/** Latitudes drawn as horizontal rings, in degrees north and south. */
const PARALLELS = [-66, -45, -22, 0, 22, 45, 66];

interface Cadence {
  label: string;
  copy: string;
  /** Accent bar colour — each row item gets its own so the eye can track them. */
  accent: string;
}

const CADENCES: Cadence[] = [
  { label: 'Second', copy: 'Builds compile and ship across our CI fleet', accent: '#60a5fa' },
  { label: 'Hourly', copy: 'Code reviews close across three time zones', accent: '#f97316' },
  { label: 'Daily', copy: 'Product squads sync asynchronously, not in meetings', accent: '#22d3ee' },
  { label: 'Weekly', copy: 'New engineers onboard into live systems', accent: '#f43f5e' },
  { label: 'Quarterly', copy: 'Teams reset goals and publish what changed', accent: '#facc15' },
];

export function GlobalScaleSection() {
  const meridians = useMemo(
    () => Array.from({ length: MERIDIAN_COUNT }, (_, i) => (i * 180) / MERIDIAN_COUNT),
    [],
  );

  return (
    <section id="global-scale" className="relative w-full py-10 sm:py-14">
      {/*
        The notched band. clip-path cuts a step out of the top-right and the
        bottom-left so the page background reads through — the same silhouette
        in light and dark mode, because the band itself is always deep navy.
      */}
      <div
        className="relative isolate overflow-hidden bg-[#0b1c33] text-white"
        style={{
          // Notch depth is fixed in pixels, not a percentage: on a tall mobile
          // stack a 7% cut would slice through the bottom row of cards.
          clipPath:
            'polygon(0 0, 51% 0, 53.5% 56px, 100% 56px, 100% 100%, 53.7% 100%, 51% calc(100% - 56px), 0 calc(100% - 56px))',
        }}
      >
        {/* Depth wash: light pools behind the globe, falls away to the left. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 68% 55%, rgba(37,99,235,0.30) 0%, rgba(11,28,51,0) 62%), linear-gradient(115deg, #071426 0%, #0b1c33 45%, #102a4c 100%)',
          }}
        />

        {/* Rotating wireframe globe */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-14%] top-1/2 hidden aspect-square w-[78%] -translate-y-1/2 sm:block lg:right-[-6%] lg:w-[62%]"
        >
          <div className="careers-globe-scene h-full w-full">
            <div className="careers-globe">
              {/* Longitude rings */}
              {meridians.map((deg) => (
                <span
                  key={`m-${deg}`}
                  className="careers-globe-ring"
                  style={{ transform: `rotateY(${deg}deg)` }}
                />
              ))}

              {/* Latitude rings — radius and height follow the sphere. */}
              {PARALLELS.map((lat) => {
                const rad = (lat * Math.PI) / 180;
                const size = `${(Math.cos(rad) * 100).toFixed(2)}%`;
                // Height is set via `top` rather than translateZ, which does
                // not accept percentages — rotateX then pivots the ring about
                // its own centre, leaving it flat at the right latitude.
                const top = `${(50 - Math.sin(rad) * 50).toFixed(2)}%`;
                return (
                  <span
                    key={`p-${lat}`}
                    className="careers-globe-parallel"
                    style={{ width: size, height: size, top }}
                  />
                );
              })}
            </div>
          </div>

          {/* Atmospheric bloom, so the wireframe reads as a lit body. */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 38% 32%, rgba(96,165,250,0.22) 0%, rgba(37,99,235,0.10) 42%, rgba(8,20,38,0) 70%)',
            }}
          />
        </div>

        <div className="relative w-full px-6 pt-16 pb-16 sm:px-10 sm:pt-20 lg:px-16 lg:pb-24 xl:px-20">
          {/* Eyebrow chip */}
          <span className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 bg-cyan-400" />
            Global by design
          </span>

          <h2 className="font-outfit mt-6 max-w-2xl text-3xl font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]">
            An engineering organisation built
            <br className="hidden sm:block" /> for work that never pauses
          </h2>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-slate-300/90 sm:text-[15px]">
            Our teams span San Francisco, London, Singapore and Bengaluru. Whether you are
            shipping to a handful of design partners or to millions of users, the work carries
            across time zones without waiting on a single office to wake up.
          </p>

          {/* Cadence cards */}
          <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-24 lg:grid-cols-5">
            {CADENCES.map((item) => (
              <article
                key={item.label}
                className="group relative overflow-hidden rounded-md border border-white/10 bg-[#050f1f]/85 pl-4 pr-4 py-4 backdrop-blur-sm transition-colors hover:border-white/25"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-[3px]"
                  style={{ backgroundColor: item.accent }}
                />
                <div
                  className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color: item.accent }}
                >
                  {item.label}
                </div>
                <p className="mt-2 text-[13px] font-medium leading-snug text-slate-200">
                  {item.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
