import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { Layout, Spacing } from '@/constants/theme';
import { useKeyboardDock } from '@/hooks/use-keyboard-dock';
import { useTheme } from '@/hooks/use-theme';

/**
 * A legal-pad page: paper background, red margin line down the left, the
 * page column capped at pad width and centered on wider paper. The page
 * scrolls under the bottom safe area and its last row ends clear of it.
 */
export function Screen({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardDock = useKeyboardDock();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          // A docked keyboard insets the ScrollView on iOS, which also brings
          // a focused input's caret above it; Android pads the page instead.
          behavior={Platform.OS === 'android' ? 'padding' : undefined}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + Spacing.five },
            ]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={keyboardDock.isDocked}
            contentInset={{ bottom: keyboardDock.inset }}>
            <ThemedView style={[styles.page, { borderLeftColor: theme.margin }]}>
              {children}
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  page: {
    width: '100%',
    maxWidth: Layout.padWidth,
    flexGrow: 1,
    borderLeftWidth: 2,
    marginLeft: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
});
