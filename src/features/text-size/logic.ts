/** The sizes a device's text can be set to, as multipliers of each style's 100% metrics. */
export const TEXT_SCALE_STEPS = [1, 1.15, 1.3, 1.5, 1.75, 2] as const;

export const DEFAULT_TEXT_SCALE: number = TEXT_SCALE_STEPS[0];
const MAX_TEXT_SCALE: number = TEXT_SCALE_STEPS[TEXT_SCALE_STEPS.length - 1];

/** A saved text size brought into range; anything that is not a size at all is 100%. */
export function validTextScale(saved: unknown): number {
  if (typeof saved !== 'number' || !Number.isFinite(saved)) return DEFAULT_TEXT_SCALE;
  return Math.min(MAX_TEXT_SCALE, Math.max(DEFAULT_TEXT_SCALE, saved));
}

/** The next step up; a value off the ladder lands on the first step above it. */
export function largerTextScale(scale: number): number {
  return TEXT_SCALE_STEPS.find((step) => step > scale) ?? MAX_TEXT_SCALE;
}

/** The next step down; a value off the ladder lands on the first step below it. */
export function smallerTextScale(scale: number): number {
  return [...TEXT_SCALE_STEPS].reverse().find((step) => step < scale) ?? DEFAULT_TEXT_SCALE;
}

export function canEnlargeText(scale: number): boolean {
  return scale < MAX_TEXT_SCALE;
}

export function canShrinkText(scale: number): boolean {
  return scale > DEFAULT_TEXT_SCALE;
}

export function isDefaultTextScale(scale: number): boolean {
  return scale === DEFAULT_TEXT_SCALE;
}

export function formatTextScale(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

/** A set of point lengths at `scale`; at 100% it is the very same object, so rendering is untouched. */
export function scaleLengths<T extends Record<string, number>>(lengths: T, scale: number): T {
  if (scale === DEFAULT_TEXT_SCALE) return lengths;
  return Object.fromEntries(
    Object.entries(lengths).map(([name, length]) => [name, length * scale]),
  ) as T;
}

/** The metrics a text style scales together: type size, line box, and any trailing glyph overhang. */
export interface TextMetrics {
  fontSize: number;
  lineHeight?: number;
  paddingRight?: number;
}

/** The same style at `scale`; at 100% it is the very same object, so rendering is untouched. */
export function scaleTextStyle<T extends TextMetrics>(style: T, scale: number): T {
  if (scale === DEFAULT_TEXT_SCALE) return style;
  return {
    ...style,
    fontSize: style.fontSize * scale,
    ...(style.lineHeight !== undefined && { lineHeight: style.lineHeight * scale }),
    ...(style.paddingRight !== undefined && {
      paddingRight: Math.ceil(style.paddingRight * scale),
    }),
  };
}
