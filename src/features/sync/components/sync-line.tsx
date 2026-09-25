import { Platform } from 'react-native';

import { ThemedText } from '@/components/themed-text';

import { describeSync } from '../logic';
import { useSyncStore } from '../store';

/** One line under the footprint: whether this pad is the one on every other device. */
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
      accessibilityLiveRegion="polite">
      {describeSync(phase, lastSyncedAt, problem)}
    </ThemedText>
  );
}
