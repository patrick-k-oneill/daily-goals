import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, HandwritingFont, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** One line of body text; rows anchor marginalia to it. */
export const BODY_LINE_HEIGHT = 24;

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'small' | 'smallBold' | 'hand' | 'handSmall' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: BODY_LINE_HEIGHT,
    fontWeight: 500,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: 600,
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
  hand: {
    fontFamily: HandwritingFont,
    fontSize: 34,
    lineHeight: 42,
  },
  handSmall: {
    fontFamily: HandwritingFont,
    fontSize: 24,
    lineHeight: 30,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: 500,
  },
});
