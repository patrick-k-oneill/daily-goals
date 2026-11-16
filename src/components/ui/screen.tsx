import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Layout, Spacing } from '@/constants/theme';
import { useKeyboardDock } from '@/hooks/use-keyboard-dock';
import { useTheme } from '@/hooks/use-theme';

const MARGIN_LINE_WIDTH = 2;
const HEADER_SHADOW_FADE_DISTANCE = 12;

interface ScreenProps {
  header?: ReactNode;
  children: ReactNode;
}

/**
 * A legal-pad page: paper background, red margin line down the left, the
 * page column capped at pad width and centered on wider paper. The page
 * scrolls under the bottom safe area and its last row ends clear of it.
 */
export function Screen({ header, children }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardDock = useKeyboardDock();
  const scrollOffset = useSharedValue(0);
  const headerShadow = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollOffset.get(),
      [0, HEADER_SHADOW_FADE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <View style={styles.flex}>
          <View
            style={[StyleSheet.absoluteFill, styles.centered, styles.fixedGutters, styles.inert]}>
            <View style={[styles.column, styles.marginLine, { borderLeftColor: theme.margin }]} />
          </View>
          {header ? (
            <View style={styles.headerHost}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  styles.inert,
                  { boxShadow: `0px 6px 8px -6px ${theme.shadow}` },
                  headerShadow,
                ]}
              />
              <View style={[styles.centered, styles.fixedGutters]}>
                <View style={[styles.column, styles.columnPadding, styles.header]}>{header}</View>
              </View>
            </View>
          ) : null}
          <KeyboardAvoidingView
            style={styles.flex}
            // A docked keyboard insets the ScrollView on iOS, which also brings
            // a focused input's caret above it; Android pads the page instead.
            behavior={Platform.OS === 'android' ? 'padding' : undefined}>
            <ScrollView
              style={[styles.flex, styles.scrollGutters]}
              contentContainerStyle={[styles.centered, styles.scrollContent]}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={keyboardDock.isDocked}
              contentInset={{ bottom: keyboardDock.inset }}
              scrollEventThrottle={16}
              onScroll={(e) => scrollOffset.set(e.nativeEvent.contentOffset.y)}>
              <View
                style={[
                  styles.column,
                  styles.columnPadding,
                  styles.page,
                  { paddingBottom: insets.bottom + Spacing.five },
                ]}>
                {children}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const scrollbarGutters = { scrollbarGutter: 'stable both-edges' } as ViewStyle;
const fixedScrollbarGutters = { ...scrollbarGutters, overflow: 'hidden' } as ViewStyle;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  inert: {
    pointerEvents: 'none',
  },
  centered: {
    alignItems: 'center',
  },
  scrollGutters: Platform.OS === 'web' ? scrollbarGutters : {},
  fixedGutters: Platform.OS === 'web' ? fixedScrollbarGutters : {},
  headerHost: {
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  column: {
    width: '100%',
    maxWidth: Layout.padWidth,
    marginLeft: Spacing.three,
  },
  marginLine: {
    flex: 1,
    borderLeftWidth: MARGIN_LINE_WIDTH,
  },
  columnPadding: {
    paddingLeft: MARGIN_LINE_WIDTH + Spacing.three,
    paddingRight: Spacing.four,
  },
  header: {
    paddingVertical: Spacing.one,
  },
  page: {
    flexGrow: 1,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
});
