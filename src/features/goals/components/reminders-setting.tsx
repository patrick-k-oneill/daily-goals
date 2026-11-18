import { Alert, Linking } from 'react-native';

import { SettingsGroup, SettingsRow } from '@/components/ui/settings-list';
import { ToggleSwitch } from '@/components/ui/toggle-switch';

import { hasReminders } from '../reminders';
import {
  disableReminders,
  enableReminders,
  useRemindersStore,
  type EnableOutcome,
} from '../reminders-store';

const SWITCH_LABEL = 'Suggest iOS Reminders due Today';

/** What to say when turning the switch on was refused. */
function explain(outcome: EnableOutcome) {
  switch (outcome) {
    case 'on':
      return;
    case 'denied':
      return Alert.alert(
        'Reminders access is off',
        'Allow Daily Goals to read Reminders in Settings, then turn this on again.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ],
      );
    case 'unavailable':
      return Alert.alert(
        'Reminders can’t be read',
        'This build of Daily Goals has no access to Reminders. Update the app, then turn this on again.',
      );
  }
}

/**
 * The switch that lets due reminders suggest goals on today's
 * page. Turning it on asks for access. Absent where there is no Reminders app.
 */
export function RemindersSetting() {
  const isEnabled = useRemindersStore((s) => s.isEnabled);
  if (!hasReminders) return null;

  const toggle = async (isOn: boolean) => {
    if (isOn) explain(await enableReminders());
    else disableReminders();
  };

  return (
    <SettingsGroup title="Suggestions">
      <SettingsRow label={SWITCH_LABEL}>
        <ToggleSwitch
          value={isEnabled}
          onValueChange={(isOn) => void toggle(isOn)}
          accessibilityLabel={SWITCH_LABEL}
        />
      </SettingsRow>
    </SettingsGroup>
  );
}
