import { useEffect, useRef, useState } from 'react';

/**
 * Fires once when an element scrolls into view.
 *
 * One-shot on purpose: sections that re-animate every time you scroll past
 * them get tiring on a long marketing page. Elements already on screen at
 * mount reveal immediately, and if IntersectionObserver is unavailable the
 * content is shown rather than left invisible.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  rootMargin = '0px 0px -12% 0px',
) {
  const ref = useRef<T | null>(null);
  // Seeded rather than set from inside the effect: without observer support the
  // content must be visible from the first paint, not after an extra render.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
