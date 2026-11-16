import {
  canZoomIn,
  canZoomOut,
  DEFAULT_TEXT_SCALE,
  scaleLengths,
  scaleTextStyle,
  textScale,
  validTextScale,
  ZOOM_STEPS,
  zoomedIn,
  zoomedOut,
} from './logic';

describe('zoom steps', () => {
  it('starts at 100% and climbs to 200%', () => {
    expect(DEFAULT_TEXT_SCALE).toBe(1);
    expect(ZOOM_STEPS).toEqual([1, 1.15, 1.3, 1.5, 1.75, 2]);
  });

  it('steps in and out along the ladder and stops at the ends', () => {
    expect(zoomedIn(1)).toBe(1.15);
    expect(zoomedIn(1.75)).toBe(2);
    expect(zoomedIn(2)).toBe(2);
    expect(zoomedOut(1.15)).toBe(1);
    expect(zoomedOut(2)).toBe(1.75);
    expect(zoomedOut(1)).toBe(1);
  });

  it('brings a value off the ladder back onto it', () => {
    expect(zoomedIn(1.2)).toBe(1.3);
    expect(zoomedOut(1.2)).toBe(1.15);
    expect(zoomedIn(3)).toBe(2);
    expect(zoomedOut(0.5)).toBe(1);
  });

  it('knows where the ends are', () => {
    expect(canZoomOut(1)).toBe(false);
    expect(canZoomIn(1)).toBe(true);
    expect(canZoomOut(2)).toBe(true);
    expect(canZoomIn(2)).toBe(false);
  });
});

describe('validTextScale', () => {
  it('keeps a size on or between the steps', () => {
    expect(validTextScale(1.5)).toBe(1.5);
    expect(validTextScale(1.2)).toBe(1.2);
  });

  it('brings a size outside 100% to 200% back to the nearer end', () => {
    expect(validTextScale(0)).toBe(1);
    expect(validTextScale(-2)).toBe(1);
    expect(validTextScale(5)).toBe(2);
  });

  it('reads anything that is not a size as 100%', () => {
    expect(validTextScale(NaN)).toBe(1);
    expect(validTextScale(Infinity)).toBe(1);
    expect(validTextScale('2')).toBe(1);
    expect(validTextScale(undefined)).toBe(1);
  });
});

describe('textScale', () => {
  it('is the system font scale where nothing is zoomed', () => {
    expect(textScale(1, 1)).toBe(1);
    expect(textScale(1.353, 1)).toBe(1.353);
  });

  it('is the zoom where the system font scale is the default', () => {
    expect(textScale(1, 1.5)).toBe(1.5);
  });

  it('multiplies the two and stops at 200%', () => {
    expect(textScale(1.118, 1.15)).toBeCloseTo(1.2857);
    expect(textScale(1.786, 1.5)).toBe(2);
    expect(textScale(3.571, 1)).toBe(2);
  });

  it('never draws the page smaller than 100%', () => {
    expect(textScale(0.823, 1)).toBe(1);
    expect(textScale(NaN, 1)).toBe(1);
  });
});

describe('scaleTextStyle', () => {
  const body = { fontSize: 16, lineHeight: 24, fontWeight: 500 } as const;

  it('returns the very same style at 100%', () => {
    expect(scaleTextStyle(body, 1)).toBe(body);
  });

  it('scales type size and line height together, leaving the rest alone', () => {
    expect(scaleTextStyle(body, 1.5)).toEqual({ fontSize: 24, lineHeight: 36, fontWeight: 500 });
  });

  it('scales a handwriting style’s trailing overhang, rounded up to a whole point', () => {
    const hand = { fontSize: 24, lineHeight: 30, paddingRight: 5 };
    expect(scaleTextStyle(hand, 1.5)).toEqual({ fontSize: 36, lineHeight: 45, paddingRight: 8 });
  });

  it('scales a style that sets only its size', () => {
    expect(scaleTextStyle({ fontSize: 11, textAlign: 'center' as const }, 2)).toEqual({
      fontSize: 22,
      textAlign: 'center',
    });
  });
});

describe('scaleLengths', () => {
  const underline = { left: -4, bottom: -1, height: 3 };

  it('returns the very same lengths at 100%', () => {
    expect(scaleLengths(underline, 1)).toBe(underline);
  });

  it('scales every length, offsets included', () => {
    expect(scaleLengths(underline, 2)).toEqual({ left: -8, bottom: -2, height: 6 });
    expect(scaleLengths({ width: 24 }, 1.5)).toEqual({ width: 36 });
  });
});
