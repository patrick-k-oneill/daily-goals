/** The star's box at 100%. */
export const STAR_BOX = 24;

/** Where the star's box sits against the title's top-right corner at 100%: up and out past it. */
export const STAR_CORNER = { top: -8, right: -18, width: STAR_BOX, height: STAR_BOX };

/**
 * The room the star needs kept clear beside the title. The page's margin holds
 * the star's reach past the title at 100%; this is what a larger text size
 * adds to that reach.
 */
export function achievedFlourishInset(scale: number): number {
  return -STAR_CORNER.right * (scale - 1);
}
