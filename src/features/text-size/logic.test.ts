import {
  canEnlargeText,
  canShrinkText,
  DEFAULT_TEXT_SCALE,
  formatTextScale,
  isDefaultTextScale,
  largerTextScale,
  scaleTextStyle,
  smallerTextScale,
  TEXT_SCALE_STEPS,
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
