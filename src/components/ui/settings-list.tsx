import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTextScale } from '@/features/text-size/store';
import { useTheme } from '@/hooks/use-theme';

const ROW_HEIGHT = 52;
const MIN_LABEL_WIDTH = 160;
const DETAIL_TAIL_FADE_MS = 350;

interface SettingsGroupProps {
  title: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function SettingsGroup({ title, footer, children }: SettingsGroupProps) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
        {title}
      </ThemedText>
      <View style={[styles.rows, { backgroundColor: theme.border, borderColor: theme.border }]}>
        {children}
      </View>
      {footer}
    </View>
  );
}

interface SettingsRowProps {
  label: string;
  detail?: string;
  detailTail?: string;
  detailColor?: ThemeColor;
  children?: ReactNode;
}

export function SettingsRow({
  label,
  detail,
  detailTail,
  detailColor = 'textSecondary',
  children,
}: SettingsRowProps) {
  const theme = useTheme();
  const scale = useTextScale();
  return (
    <View
      style={[
        styles.row,
        { minHeight: ROW_HEIGHT * scale, backgroundColor: theme.backgroundElement },
      ]}>
      <View style={[styles.rowText, { flexBasis: MIN_LABEL_WIDTH * scale }]}>
        <ThemedText>{label}</ThemedText>
        {detail ? (
          <View
            accessible
            accessibilityLabel={detailTail ? `${detail} ${detailTail}` : detail}
            accessibilityLiveRegion="polite"
            style={styles.detail}>
            <ThemedText type="small" themeColor={detailColor} style={styles.detailText}>
              {detail}
            </ThemedText>
            {detailTail ? (
              <LayoutAnimationConfig skipEntering skipExiting>
                <Animated.View
                  key={detailTail}
                  entering={FadeIn.duration(DETAIL_TAIL_FADE_MS)}
                  exiting={FadeOut.duration(DETAIL_TAIL_FADE_MS)}>
                  <ThemedText type="small" themeColor={detailColor}>
                    {detailTail}
                  </ThemedText>
                </Animated.View>
              </LayoutAnimationConfig>
            ) : null}
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export interface Notice {
  tone: 'ok' | 'error';
  text: string;
}

export function SettingsNotice({ tone, text }: Notice) {
  return (
    <ThemedText
      type="small"
      themeColor={tone === 'error' ? 'missed' : 'textSecondary'}
      accessibilityLiveRegion="polite"
      style={styles.notice}>
      {text}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  title: {
    paddingHorizontal: Spacing.three,
  },
  rows: {
    gap: StyleSheet.hairlineWidth,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    columnGap: Spacing.three,
    rowGap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowText: {
    flexGrow: 1,
    flexShrink: 1,
  },
  detail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.one,
  },
  detailText: {
    flexShrink: 1,
  },
  notice: {
    paddingHorizontal: Spacing.three,
  },
});
