import type { CheckState } from '../types';

import { goalListLayouts, goalRowLayout, type RowChecks } from './goal-row-layout';

function row(count: number, checkLabels?: string[]): RowChecks {
  return { checks: Array.from({ length: count }, (): CheckState => 'empty'), checkLabels };
}

describe('goal row fit rule', () => {
  // Measured row widths: 375pt viewport → ~317pt; 402pt (iPhone 17 Pro) → ~344pt;
  // the pad-width column (Layout.padWidth, the widest a row ever gets) → 598pt.
  it('stacks the 7- and 8-check goals at phone width', () => {
    expect(goalRowLayout(317, row(7))).toBe('stacked');
    expect(goalRowLayout(317, row(8))).toBe('stacked');
  });

  it('stacks a 7-check goal at real-device width (402pt viewport)', () => {
    expect(goalRowLayout(344, row(7))).toBe('stacked');
  });

  it('keeps every seeded goal inline in the pad-width column', () => {
    for (const count of [1, 6, 7, 8]) {
      expect(goalRowLayout(598, row(count))).toBe('inline');
    }
  });

  it('keeps even a ten-check goal inline in the pad-width column', () => {
    expect(goalRowLayout(598, row(10))).toBe('inline'); // 10·28 + 9·4 = 316 checks + 160 title
  });

  it('keeps a 1-check goal inline down to the narrowest supported viewport', () => {
    expect(goalRowLayout(262, row(1))).toBe('inline'); // 320pt viewport → ~262pt row
  });

  it('flips exactly where seven boxes, six gaps, and the minimum title stop fitting', () => {
    expect(goalRowLayout(380, row(7))).toBe('inline'); // 7·28 + 6·4 = 220 checks + 160 title
    expect(goalRowLayout(379, row(7))).toBe('stacked');
  });

  it('treats an unmeasured row as inline', () => {
    expect(goalRowLayout(0, row(8))).toBe('inline');
  });
});

describe('check labels in the fit rule', () => {
  const fitness = ['Legs', 'Push', 'Pull', 'Legs', 'Push', 'Pull', 'Core'];
  const sixWide = Array.from({ length: 7 }, () => 'Sprint'); // 6 chars → 36pt columns

  it('leaves short labels like Fitness’s at box width', () => {
    expect(goalRowLayout(380, row(7, fitness))).toBe('inline');
    expect(goalRowLayout(379, row(7, fitness))).toBe('stacked');
  });

  it('counts a labeled column as the wider of the box and about 6pt per character', () => {
    expect(goalRowLayout(436, row(7, sixWide))).toBe('inline'); // 7·36 + 6·4 = 276 checks + 160 title
    expect(goalRowLayout(435, row(7, sixWide))).toBe('stacked');
  });

  it('widens only the labeled columns of a partially labeled row', () => {
    const partial = ['Sprint', '', ''];
    expect(goalRowLayout(260, row(3, partial))).toBe('inline'); // 36 + 28 + 28 + 2·4 = 100 checks + 160 title
    expect(goalRowLayout(259, row(3, partial))).toBe('stacked');
  });

  it('lets one wide-labeled row stack its whole section', () => {
    expect(goalListLayouts(400, [row(7), row(6)])).toEqual(['inline', 'inline']);
    expect(goalListLayouts(400, [row(7, sixWide), row(6)])).toEqual(['stacked', 'stacked']);
  });
});

describe('goalListLayouts (one rhythm per section)', () => {
  it('stacks every multi-check row when any one of them must stack', () => {
    // Native 402pt content ≈ 344pt: the 6-check row would fit alone, but the
    // 7-check rows force the whole section into the stacked rhythm.
    const rows = [row(7), row(7), row(6)];
    expect(goalListLayouts(344, rows)).toEqual(['stacked', 'stacked', 'stacked']);
    expect(goalListLayouts(317, rows)).toEqual(['stacked', 'stacked', 'stacked']);
  });

  it('keeps a fitting section fully inline', () => {
    expect(goalListLayouts(598, [row(7), row(7), row(6)])).toEqual(['inline', 'inline', 'inline']);
    expect(goalListLayouts(598, [row(1), row(8), row(10)])).toEqual(['inline', 'inline', 'inline']);
  });

  it('always keeps 1-check rows inline, even inside a stacked section', () => {
    expect(goalListLayouts(317, [row(1), row(8)])).toEqual(['inline', 'stacked']);
    expect(goalListLayouts(344, [row(1), row(8)])).toEqual(['inline', 'stacked']);
  });

  it('harmonizes exactly at the widest row’s own boundary', () => {
    expect(goalListLayouts(380, [row(7), row(6)])).toEqual(['inline', 'inline']);
    expect(goalListLayouts(379, [row(7), row(6)])).toEqual(['stacked', 'stacked']);
  });

  it('handles empty lists and unmeasured widths', () => {
    expect(goalListLayouts(344, [])).toEqual([]);
    expect(goalListLayouts(0, [row(7), row(7), row(6)])).toEqual(['inline', 'inline', 'inline']);
  });
});
