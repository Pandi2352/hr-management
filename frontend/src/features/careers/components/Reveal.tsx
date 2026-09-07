import type { ReactNode } from 'react';
import { useInView } from '../hooks/useInView';

type RevealDirection = 'up' | 'left' | 'right' | 'scale';

interface RevealProps {
  children: ReactNode;
  direction?: RevealDirection;
  /** Milliseconds; use to stagger siblings. */
  delay?: number;
  className?: string;
}

/**
 * Scroll-in wrapper. The transform/opacity pair is driven by a class swap
 * rather than inline animation, so nothing runs until the element is actually
 * near the viewport and `prefers-reduced-motion` can disable it wholesale from
 * the stylesheet.
 */
export function Reveal({ children, direction = 'up', delay = 0, className = '' }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`careers-reveal careers-reveal-${direction} ${inView ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
