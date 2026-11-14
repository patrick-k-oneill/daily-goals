import {
  canEnlargeText,
  canShrinkText,
  DEFAULT_TEXT_SCALE,
  formatTextScale,
  isDefaultTextScale,
  largerTextScale,
  scaleLengths,
  scaleTextStyle,
  smallerTextScale,
  TEXT_SCALE_STEPS,
  validTextScale,
} from './logic';

describe('text size steps', () => {
  it('starts at 100% and climbs to 200%', () => {
    expect(DEFAULT_TEXT_SCALE).toBe(1);
    expect(TEXT_SCALE_STEPS).toEqual([1, 1.15, 1.3, 1.5, 1.75, 2]);
  });

  it('steps up and down the ladder and stops at the ends', () => {
    expect(largerTextScale(1)).toBe(1.15);
    expect(largerTextScale(1.75)).toBe(2);
    expect(largerTextScale(2)).toBe(2);
    expect(smallerTextScale(1.15)).toBe(1);
    expect(smallerTextScale(2)).toBe(1.75);
    expect(smallerTextScale(1)).toBe(1);
  });

  it('brings a value off the ladder back onto it', () => {
    expect(largerTextScale(1.2)).toBe(1.3);
    expect(smallerTextScale(1.2)).toBe(1.15);
    expect(largerTextScale(3)).toBe(2);
    expect(smallerTextScale(0.5)).toBe(1);
  });

  it('knows where the ends are', () => {
    expect(canShrinkText(1)).toBe(false);
    expect(canEnlargeText(1)).toBe(true);
    expect(canShrinkText(2)).toBe(true);
    expect(canEnlargeText(2)).toBe(false);
    expect(isDefaultTextScale(1)).toBe(true);
    expect(isDefaultTextScale(1.15)).toBe(false);
  });

  it('formats as a whole percent', () => {
    expect(formatTextScale(1)).toBe('100%');
    expect(formatTextScale(1.15)).toBe('115%');
    expect(formatTextScale(2)).toBe('200%');
  });
});

describe('validTextScale', () => {
  it('keeps a saved size on or between the steps', () => {
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
