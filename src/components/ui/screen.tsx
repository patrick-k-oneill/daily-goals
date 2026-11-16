import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Layout, Spacing } from '@/constants/theme';
import { useKeyboardDock } from '@/hooks/use-keyboard-dock';
import { useTheme } from '@/hooks/use-theme';

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

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {header ? (
          <View style={[styles.headerBar, styles.headerGutters, { borderBottomColor: theme.rule }]}>
            <View style={[styles.column, styles.header, { borderLeftColor: theme.margin }]}>
              {header}
            </View>
          </View>
        ) : null}
        <KeyboardAvoidingView
          style={styles.flex}
          // A docked keyboard insets the ScrollView on iOS, which also brings
          // a focused input's caret above it; Android pads the page instead.
          behavior={Platform.OS === 'android' ? 'padding' : undefined}>
          <ScrollView
            style={[styles.flex, styles.gutters]}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={keyboardDock.isDocked}
            contentInset={{ bottom: keyboardDock.inset }}>
            <ThemedView
              style={[
                styles.column,
                styles.page,
                { borderLeftColor: theme.margin, paddingBottom: insets.bottom + Spacing.five },
              ]}>
              {children}
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const scrollbarGutters = { scrollbarGutter: 'stable both-edges' } as ViewStyle;
const headerScrollbarGutters = { ...scrollbarGutters, overflow: 'hidden' } as ViewStyle;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  gutters: Platform.OS === 'web' ? scrollbarGutters : {},
  headerGutters: Platform.OS === 'web' ? headerScrollbarGutters : {},
  headerBar: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: Layout.padWidth,
    borderLeftWidth: 2,
    marginLeft: Spacing.three,
    paddingLeft: Spacing.three,
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
