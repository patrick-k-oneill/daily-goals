/**
 * Design tokens for the legal-pad aesthetic: warm paper, blue rule lines,
 * red margin, ink text, yellow controls. Every color exists in both schemes
 * under the same key.
 */

export const Colors = {
  light: {
    text: '#26221B',
    textSecondary: '#7A7260',
    background: '#FAF5E4',
    backgroundElement: '#F3ECD3',
    backgroundSelected: '#EAE1C0',
    rule: '#B9D8E2',
    margin: '#D95D53',
    // Marginalia (stars, asides, the not-today date); never a control.
    accent: '#D95D53',
    // Controls. The yellow fill carries ink at 4.5:1; primaryEdge, not the fill,
    // holds 3:1 against the page as the pill and selected-chip outline (theme.test.ts).
    primary: '#FFD23F',
    primaryPressed: '#F5C518',
    primaryEdge: '#A67C00',
    onPrimary: '#26221B',
    missed: '#B04A42',
    border: '#DCD3B4',
  },
  dark: {
    text: '#EDE5D0',
    textSecondary: '#9E9581',
    background: '#171410',
    backgroundElement: '#211D15',
    backgroundSelected: '#2C271C',
    rule: '#3D5A69',
    margin: '#C96158',
    accent: '#E07B72',
    primary: '#F2C230',
    primaryPressed: '#D9AA20',
    primaryEdge: '#F2C230',
    onPrimary: '#26221B',
    missed: '#D98078',
    border: '#3A3426',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Handwriting face for headers; loaded in the root layout via expo-font. */
export const HandwritingFont = 'Caveat_700Bold';

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Layout = {
  /** A legal pad is 8.5" wide: the page column never grows past this, whatever the window. */
  padWidth: 640,
} as const;
