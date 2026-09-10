import { Link, useLocation } from 'react-router-dom';
import { CaretLeft, CaretRight, GearSix } from '@phosphor-icons/react';
import { Tooltip } from '../../ui/tooltip';
import { useCustomizer } from '../../../features/customizer';
import { cn } from '../../../utils/cn';
import {
  SPOTLIGHT_BRAND,
  SPOTLIGHT_ITEMS,
  SPOTLIGHT_TINTS,
  type SpotlightItem,
} from './spotlightRail.config';

export interface SpotlightRailProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Width class from `useSpotlightRail`, so the layout's gutter always matches. */
  railClass: string;
}

/**
 * The right-hand spotlight rail.
 *
 * A second, much shorter rail for the features people reach for out of interest
 * rather than obligation. The left sidebar is the product's index and answers
 * "where is everything"; this one answers "take me back to the good part", and
 * it stays short enough that its icons are learnable as shapes.
 *
 * Colour does real work here, unlike in a directory grid. There are four tiles,
 * each owns a hue permanently, and only the page you are on is filled — so the
 * rail reads as a position indicator at a glance rather than as decoration.
 *
 * Its contents live entirely in `spotlightRail.config.tsx`. Nothing about a new
 * feature should require editing this file.
 */
export function SpotlightRail({ collapsed, onToggleCollapsed, railClass }: SpotlightRailProps) {
  const location = useLocation();
  const { openCustomizer } = useCustomizer();

  const isActive = (item: SpotlightItem) =>
    item.exact
      ? location.pathname === item.href
      : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);

  /*
   * A div rather than an <aside>: globals.css restyles every aside on the page
   * when the dark-sidebar theme is on, which would drag the left sidebar's
   * chrome onto this rail and break its colours.
   *
   * In the flow rather than fixed. As a fixed overlay it started at the top of
   * the viewport, so it sat alongside the navbar and cut the header line in
   * half, and the content had to reserve a matching gutter by hand. As a flex
   * child of the row below the navbar it lines up with the content, spacing
   * takes care of itself, and there is no width to keep in step.
   */
  return (
    <div
      role="complementary"
      aria-label="Spotlight features"
      className={cn(
        'hidden h-full shrink-0 border-l border-hairline bg-surface transition-[width] duration-200 lg:flex lg:flex-col',
        railClass,
      )}
    >
      {collapsed ? (
        // Collapsed to a hairline handle: the rail gives its width back to the
        // page but stays one click away, and never disappears entirely.
        <Tooltip content="Show spotlight" placement="left" delay={100}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Show the spotlight rail"
            className="group flex h-full w-full cursor-pointer items-center justify-center hover:bg-surface-2"
          >
            <CaretLeft className="h-3 w-3 text-ink-3 transition-transform group-hover:-translate-x-px" />
          </button>
        </Tooltip>
      ) : (
        <>
          <div className="flex flex-col items-center gap-1 pt-3">
            <Tooltip
              content={`${SPOTLIGHT_BRAND.label} · ${SPOTLIGHT_BRAND.hint}`}
              placement="left"
              delay={100}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2">
                <SPOTLIGHT_BRAND.icon className="h-4 w-4 text-ink-2" weight="fill" />
              </span>
            </Tooltip>

            <span className="my-2 h-px w-6 bg-hairline" />
          </div>

          <nav className="flex flex-1 flex-col items-center gap-1.5">
            {SPOTLIGHT_ITEMS.map((item) => {
              const tone = SPOTLIGHT_TINTS[item.tint] ?? SPOTLIGHT_TINTS.violet;
              const active = isActive(item);
              const Icon = item.icon;

              return (
                <Tooltip
                  key={item.id}
                  content={`${item.label}${item.soon ? ' · coming soon' : ''} · ${item.hint}`}
                  placement="left"
                  delay={100}
                >
                  <Link
                    to={item.href}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex h-9 w-9 items-center justify-center rounded-md transition-all duration-150',
                      active ? tone.active : cn('text-ink-3', tone.hover),
                      item.soon && !active && 'opacity-60',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[19px] w-[19px] transition-transform duration-150 group-hover:scale-110',
                        active ? 'text-white' : tone.idle,
                      )}
                      weight={active ? 'fill' : 'regular'}
                    />

                    {/* A count, when a feature has one worth surfacing */}
                    {item.badge ? (
                      <span
                        className={cn(
                          'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-md px-1 text-[9px] font-bold tabular-nums text-white',
                          tone.dot,
                        )}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}

                    {/* The active marker sits on the rail's outer edge, so the
                        strip reads as a position indicator down the side. */}
                    {active && (
                      <span
                        className={cn(
                          'absolute -right-[1px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-l-md',
                          tone.dot,
                        )}
                      />
                    )}
                  </Link>
                </Tooltip>
              );
            })}
          </nav>

          <div className="flex flex-col items-center gap-1 pb-3">
            <span className="mb-2 h-px w-6 bg-hairline" />

            <Tooltip content="Theme & customization" placement="left" delay={100}>
              <button
                type="button"
                onClick={openCustomizer}
                aria-label="Theme and customization"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-violet-600 dark:hover:text-violet-400"
              >
                <GearSix className="h-[18px] w-[18px]" weight="duotone" />
              </button>
            </Tooltip>

            <Tooltip content="Hide spotlight" placement="left" delay={100}>
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="Hide the spotlight rail"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <CaretRight className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        </>
      )}
    </div>
  );
}
