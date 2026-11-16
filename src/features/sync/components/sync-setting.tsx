import { Platform } from 'react-native';

import { SettingsGroup, SettingsRow } from '@/components/ui/settings-list';

import { describeSync } from '../logic';
import { useSyncStore } from '../store';

export function SyncSetting() {
  const phase = useSyncStore((s) => s.phase);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const problem = useSyncStore((s) => s.problem);

  // Web has no iCloud; export and import are its bridge.
  if (Platform.OS === 'web') return null;

  return (
    <SettingsGroup title="iCloud">
      <SettingsRow
        label="iCloud sync"
        detail={describeSync(phase, lastSyncedAt, problem)}
        detailColor={phase === 'error' ? 'missed' : 'textSecondary'}
      />
    </SettingsGroup>
  );
}
