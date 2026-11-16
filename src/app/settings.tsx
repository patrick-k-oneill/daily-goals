import { useRouter } from 'expo-router';

import { HeaderBar, HeaderButton } from '@/components/ui/header-bar';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/section-header';
import { BackupSettings } from '@/features/backup/components/backup-settings';
import { FeedbackSettings } from '@/features/feedback/components/feedback-settings';
import { RemindersSetting } from '@/features/goals/components/reminders-setting';
import { SyncSetting } from '@/features/sync/components/sync-setting';

export default function SettingsScreen() {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen
      header={
        <HeaderBar>
          <HeaderButton label="‹ Back" accessibilityLabel="Back to the pad" onPress={goBack} />
        </HeaderBar>
      }>
      <SectionHeader title="Settings" />
      <RemindersSetting />
      <SyncSetting />
      <BackupSettings />
      <FeedbackSettings />
    </Screen>
  );
}
