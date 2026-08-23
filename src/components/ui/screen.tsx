import { type ReactNode, type Ref } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A legal-pad page: paper background, red margin line down the left,
 * content capped at a readable width. Native gets bottom-tab clearance;
 * web's tab bar is in-flow above the page. `scrollRef` exposes the page's
 * ScrollView for routes that need to scroll programmatically.
 */
export function Screen({
  children,
  scrollRef,
}: {
  children: ReactNode;
  scrollRef?: Ref<ScrollView>;
}) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
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
    paddingBottom: BottomTabInset + Spacing.five,
  },
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    borderLeftWidth: 2,
    marginLeft: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
});
