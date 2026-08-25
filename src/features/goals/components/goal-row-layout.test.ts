import { goalListLayouts, goalRowLayout } from './goal-row-layout';

describe('goal row fit rule', () => {
  // Measured row widths: 375pt viewport → ~317pt; 402pt (iPhone 17 Pro) → ~344pt;
  // desktop content column → ~650–678pt.
  it('stacks the 7- and 8-check goals at phone width', () => {
    expect(goalRowLayout(317, 7)).toBe('stacked');
    expect(goalRowLayout(317, 8)).toBe('stacked');
  });

  it('stacks a 7-check goal at real-device width (402pt viewport)', () => {
    expect(goalRowLayout(344, 7)).toBe('stacked');
  });

  it('keeps every seeded goal inline at desktop width', () => {
    for (const count of [1, 6, 7, 8]) {
      expect(goalRowLayout(650, count)).toBe('inline');
      expect(goalRowLayout(678, count)).toBe('inline');
    }
  });

  it('keeps a 1-check goal inline down to the narrowest supported viewport', () => {
    expect(goalRowLayout(262, 1)).toBe('inline'); // 320pt viewport → ~262pt row
  });

  it('flips exactly where seven boxes, six gaps, and the minimum title stop fitting', () => {
    expect(goalRowLayout(380, 7)).toBe('inline'); // 7·28 + 6·4 = 220 checks + 160 title
    expect(goalRowLayout(379, 7)).toBe('stacked');
  });

  it('treats an unmeasured row as inline', () => {
    expect(goalRowLayout(0, 8)).toBe('inline');
  });
});

describe('goalListLayouts (one rhythm per section)', () => {
  it('stacks every multi-check row when any one of them must stack', () => {
    // Native 402pt content ≈ 344pt: the 6-check row would fit alone, but the
    // 7-check rows force the whole section into the stacked rhythm.
    expect(goalListLayouts(344, [7, 7, 6])).toEqual(['stacked', 'stacked', 'stacked']);
    expect(goalListLayouts(317, [7, 7, 6])).toEqual(['stacked', 'stacked', 'stacked']);
  });

  it('keeps a fitting section fully inline', () => {
    for (const width of [650, 678]) {
      expect(goalListLayouts(width, [7, 7, 6])).toEqual(['inline', 'inline', 'inline']);
      expect(goalListLayouts(width, [1, 8])).toEqual(['inline', 'inline']);
    }
  });

  it('always keeps 1-check rows inline, even inside a stacked section', () => {
    expect(goalListLayouts(317, [1, 8])).toEqual(['inline', 'stacked']);
    expect(goalListLayouts(344, [1, 8])).toEqual(['inline', 'stacked']);
  });

  it('harmonizes exactly at the widest row’s own boundary', () => {
    expect(goalListLayouts(380, [7, 6])).toEqual(['inline', 'inline']);
    expect(goalListLayouts(379, [7, 6])).toEqual(['stacked', 'stacked']);
  });

  it('handles empty lists and unmeasured widths', () => {
    expect(goalListLayouts(344, [])).toEqual([]);
    expect(goalListLayouts(0, [7, 7, 6])).toEqual(['inline', 'inline', 'inline']);
  });
});
