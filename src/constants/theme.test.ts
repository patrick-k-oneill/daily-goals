import { Colors } from './theme';

/** WCAG 2.x relative luminance of a #RRGGBB color. Test-only math. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [darker, lighter] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => x - y);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('dark-mode rule lines', () => {
  it('keeps the rule visible at ≥2.5:1 against the dark background', () => {
    expect(contrastRatio(Colors.dark.rule, Colors.dark.background)).toBeGreaterThanOrEqual(2.5);
  });
});
