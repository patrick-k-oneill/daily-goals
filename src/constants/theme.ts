/**
 * Design tokens for the legal-pad aesthetic: warm paper, blue rule lines,
 * red margin, ink text. Every color exists in both schemes under the same key.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#26221B',
    textSecondary: '#7A7260',
    background: '#FAF5E4',
    backgroundElement: '#F3ECD3',
    backgroundSelected: '#EAE1C0',
    rule: '#B9D8E2',
    margin: '#D95D53',
    accent: '#D95D53',
    onAccent: '#FFFFFF',
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
    onAccent: '#FFFFFF',
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

// iOS 26's floating tab pill is taller than the classic bar; 68 keeps the
// page's last line ≥16pt clear of it at max scroll.
export const BottomTabInset = Platform.select({ ios: 68, android: 80 }) ?? 0;
export const MaxContentWidth = 720;
