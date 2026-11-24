import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Alert, Linking, Platform } from 'react-native';

import { TextButton } from '@/components/ui/form';
import { SettingsGroup, SettingsRow } from '@/components/ui/settings-list';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

import { dateAt, formatReminderTime, REMINDER_BODY, timeOfDay } from '../logic';
import { hasNotifications } from '../notifications';
import {
  disableMorningReminder,
  enableMorningReminder,
  moveMorningReminder,
  useMorningReminderStore,
  type EnableOutcome,
} from '../store';
import type { ReminderTime } from '../types';

const SWITCH_LABEL = 'Morning reminder';
const TIME_LABEL = 'Remind me at';

function explain(outcome: EnableOutcome) {
  switch (outcome) {
    case 'on':
      return;
    case 'denied':
      return Alert.alert(
        'Notifications are off',
        'Allow Daily Goals to send notifications in Settings, then turn this on again.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ],
      );
    case 'unavailable':
      return Alert.alert(
        'Reminders can’t be scheduled',
        'This build of Daily Goals can’t post notifications. Update the app, then turn this on again.',
      );
  }
}

/**
 * The morning reminder: a switch, and once it is on the time of day it goes
 * off. Turning it on asks to notify. Absent where nothing can be posted.
 */
export function MorningReminderSetting() {
  const isOn = useMorningReminderStore((s) => s.isOn);
  const time = useMorningReminderStore((s) => s.time);
  if (!hasNotifications) return null;

  const toggle = async (next: boolean) => {
    if (next) explain(await enableMorningReminder());
    else await disableMorningReminder();
  };

  return (
    <SettingsGroup title="Reminder">
      <SettingsRow label={SWITCH_LABEL} detail={`“${REMINDER_BODY}”, once a day.`}>
        <ToggleSwitch
          value={isOn}
          onValueChange={(next) => void toggle(next)}
          accessibilityLabel={SWITCH_LABEL}
        />
      </SettingsRow>
      {isOn ? (
        <SettingsRow label={TIME_LABEL}>
          <ReminderTimePicker time={time} />
        </SettingsRow>
      ) : null}
    </SettingsGroup>
  );
}

/**
 * The time of day, picked the platform's way: iOS draws a compact picker in
 * the row; Android's is a dialog, opened from the time shown.
 */
function ReminderTimePicker({ time }: { time: ReminderTime }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const value = dateAt(time, new Date());
  const pick = (picked: Date) => void moveMorningReminder(timeOfDay(picked));
  const accessibilityLabel = `${TIME_LABEL} ${formatReminderTime(time)}`;

  if (Platform.OS === 'android') {
    return (
      <TextButton
        label={formatReminderTime(time)}
        themeColor="text"
        type="default"
        accessibilityLabel={accessibilityLabel}
        onPress={() =>
          DateTimePickerAndroid.open({
            mode: 'time',
            value,
            onValueChange: (_event, picked) => pick(picked),
          })
        }
      />
    );
  }

  return (
    <DateTimePicker
      mode="time"
      display="compact"
      value={value}
      onValueChange={(_event, picked) => pick(picked)}
      themeVariant={dark ? 'dark' : 'light'}
      accentColor={theme.primaryEdge}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
