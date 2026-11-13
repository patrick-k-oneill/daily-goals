import { Platform, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

import { describeSync } from '../logic';
import { useSyncStore } from '../store';

/** The pad footer's line on whether this pad is the one on every other device. */
export function SyncLine() {
  const phase = useSyncStore((s) => s.phase);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const problem = useSyncStore((s) => s.problem);

  // Web has no iCloud; export and import are its bridge.
  if (Platform.OS === 'web') return null;

  return (
    <ThemedText
      type="small"
      themeColor={phase === 'error' ? 'missed' : 'textSecondary'}
      accessibilityLiveRegion="polite"
      style={styles.line}>
      {describeSync(phase, lastSyncedAt, problem)}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  // A long line wraps inside the footer row rather than running past the page.
  line: {
    flexShrink: 1,
  },
});
