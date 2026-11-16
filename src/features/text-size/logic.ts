export const ZOOM_STEPS = [1, 1.15, 1.3, 1.5, 1.75, 2] as const;

export const DEFAULT_TEXT_SCALE: number = ZOOM_STEPS[0];
const MAX_TEXT_SCALE: number = ZOOM_STEPS[ZOOM_STEPS.length - 1];

export function validTextScale(scale: unknown): number {
  if (typeof scale !== 'number' || !Number.isFinite(scale)) return DEFAULT_TEXT_SCALE;
  return Math.min(MAX_TEXT_SCALE, Math.max(DEFAULT_TEXT_SCALE, scale));
}

export function textScale(systemFontScale: number, zoom: number): number {
  return validTextScale(validTextScale(systemFontScale) * validTextScale(zoom));
}

export function zoomedIn(zoom: number): number {
  return ZOOM_STEPS.find((step) => step > zoom) ?? MAX_TEXT_SCALE;
}

export function zoomedOut(zoom: number): number {
  return [...ZOOM_STEPS].reverse().find((step) => step < zoom) ?? DEFAULT_TEXT_SCALE;
}

export function canZoomIn(systemFontScale: number, zoom: number): boolean {
  return textScale(systemFontScale, zoomedIn(zoom)) > textScale(systemFontScale, zoom);
}

export function canZoomOut(systemFontScale: number, zoom: number): boolean {
  return textScale(systemFontScale, zoomedOut(zoom)) < textScale(systemFontScale, zoom);
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
