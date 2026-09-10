import { useEffect, useState } from 'react';
import { storage } from '../utils/storage';

const STORAGE_KEY = 'peopleos-spotlight-rail-collapsed';

/**
 * The rail's two widths, as literal class strings.
 *
 * Written out rather than composed from a number, because Tailwind scans source
 * text: an interpolated `w-[${width}px]` is never generated and the rail would
 * collapse to nothing.
 *
 * There is no matching gutter any more. The rail is a flex child of the content
 * row rather than a fixed overlay, so the layout reserves its width by having
 * it in the flow — which is one fewer number to keep in step, and the reason
 * the earlier version left dead space when collapsed.
 */
const RAIL_WIDTHS = {
  expanded: 'lg:w-[52px]',
  collapsed: 'lg:w-[14px]',
} as const;

/**
 * Open/closed state for the right-hand spotlight rail.
 *
 * Lifted out of the rail component because the layout renders it, and because
 * the collapse has to survive a reload the same way the left sidebar's does.
 *
 * Mirrors `useSidebar` — same storage helper, same shape — so both rails are
 * managed the same way.
 */
export function useSpotlightRail() {
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    storage.get<boolean>(STORAGE_KEY, false),
  );

  useEffect(() => {
    storage.set(STORAGE_KEY, collapsed);
  }, [collapsed]);

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed: () => setCollapsed((prev) => !prev),
    /** Width class for the rail itself. */
    railClass: collapsed ? RAIL_WIDTHS.collapsed : RAIL_WIDTHS.expanded,
  };
}
