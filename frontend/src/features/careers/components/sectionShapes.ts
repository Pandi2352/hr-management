/**
 * Clip-path silhouettes for the careers bands.
 *
 * Every offset is in pixels rather than a percentage: a percentage notch cuts
 * proportionally deeper as a section gets taller, which on a stacked mobile
 * layout slices straight through the content. Pixels keep the same slice at
 * any height.
 *
 * Each band gets its own silhouette so the page reads as a set of siblings
 * rather than one shape repeated.
 */

/** About — both edges slope right, bottom-left corner chamfered. */
export const CLIP_SLICE =
  'polygon(0 0, 100% 72px, 100% 100%, 132px 100%, 0 calc(100% - 132px))';

/** What we do — a shallow V bitten out of the top edge. */
export const CLIP_CHEVRON =
  'polygon(0 0, 42% 0, 50% 64px, 58% 0, 100% 0, 100% 100%, 0 100%)';

/** Scalability — stepped notch, top-right and bottom-left. */
export const CLIP_STEP =
  'polygon(0 0, 51% 0, 53.5% 56px, 100% 56px, 100% 100%, 53.7% 100%, 51% calc(100% - 56px), 0 calc(100% - 56px))';

/** Perks — opposing corners cut, top-left and bottom-right. */
export const CLIP_CHAMFER =
  'polygon(120px 0, 100% 0, 100% calc(100% - 120px), calc(100% - 120px) 100%, 0 100%, 0 120px)';

/** Open roles — a tab stepped out of the top-left. */
export const CLIP_TAB =
  'polygon(0 0, 34% 0, 36% 60px, 100% 60px, 100% 100%, 0 100%)';

/** Locations — angled top edge rising to the right. */
export const CLIP_WEDGE = 'polygon(0 80px, 100% 0, 100% 100%, 0 100%)';

/** Hero — bottom edge falls away to the left, handing off into the About slice. */
export const CLIP_HERO = 'polygon(0 0, 100% 0, 100% calc(100% - 76px), 0 100%)';
