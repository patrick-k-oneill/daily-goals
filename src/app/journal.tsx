import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SectionHeader } from '@/components/ui/section-header';
import { Screen } from '@/components/ui/screen';
import { GratitudeCard } from '@/features/gratitude/components/gratitude-card';
import { GratitudeEditor } from '@/features/gratitude/components/gratitude-editor';
import { currentReflectionDate, sortedEntries } from '@/features/gratitude/logic';
import { useGratitudeStore } from '@/features/gratitude/store';
import { Spacing } from '@/constants/theme';
import { formatPadDate, todayKey } from '@/lib/dates';

export default function JournalScreen() {
  const entries = useGratitudeStore((s) => s.entries);

  const reflectionDate = currentReflectionDate();
  const history = sortedEntries(entries).filter((e) => e.forDate !== reflectionDate);

  return (
    <Screen>
      <SectionHeader title="Gratitude Journal" detail={formatPadDate(todayKey())} />
      <GratitudeEditor />

      {history.length > 0 && (
        <View style={{ gap: Spacing.two }}>
          <ThemedText type="handSmall" themeColor="textSecondary">
            Past mornings
          </ThemedText>
          {history.map((entry) => (
            <GratitudeCard key={entry.forDate} entry={entry} />
          ))}
        </View>
      )}
    </Screen>
  );
}
