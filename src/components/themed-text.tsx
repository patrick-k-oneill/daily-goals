import { StyleSheet, Text, type TextProps } from 'react-native';

import { HandwritingFont, ThemeColor } from '@/constants/theme';
import { scaleTextStyle } from '@/features/text-size/logic';
import { useTextScale } from '@/features/text-size/store';
import { useTheme } from '@/hooks/use-theme';

/** One line of body text at 100%. */
export const BODY_LINE_HEIGHT = 24;

/**
 * Caveat's script glyphs reach up to 0.21 em past their advance width on the
 * right (the widest is a trailing "f"); the Text box is sized to advances
 * alone, so without this trailing padding the last glyph's edge is cut off.
 */
const HANDWRITING_OVERHANG_EM = 0.21;

function handwriting(fontSize: number, lineHeight: number) {
  return {
    fontFamily: HandwritingFont,
    fontSize,
    lineHeight,
    paddingRight: Math.ceil(fontSize * HANDWRITING_OVERHANG_EM),
    // Android only: the font's extra ascender/descender allowance would push
    // the glyphs off-center within the explicit lineHeight.
    includeFontPadding: false,
  } as const;
}

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'subtitle' | 'small' | 'smallBold' | 'hand' | 'handSmall';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const scale = useTextScale();

  return (
    <Text
      style={[{ color: theme[themeColor ?? 'text'] }, scaleTextStyle(styles[type], scale), style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: BODY_LINE_HEIGHT,
    fontWeight: 500,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 600,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  hand: handwriting(34, 42),
  handSmall: handwriting(24, 30),
});
