import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DATE_PICKER_WIDTH, DatePicker } from '@/components/ui/date-picker';
import { HeaderBar, HeaderButton } from '@/components/ui/header-bar';
import { Popover } from '@/components/ui/popover';
import { Spacing } from '@/constants/theme';
import { useTextScale } from '@/features/text-size/store';
import { addDays, formatPadDate, type DayKey } from '@/lib/dates';

interface PageHeaderProps {
  day: DayKey;
  today: DayKey;
  onShowDay: (day: DayKey) => void;
  onOpenSettings: () => void;
}

export function PageHeader({ day, today, onShowDay, onOpenSettings }: PageHeaderProps) {
  const scale = useTextScale();
  const date = useRef<View>(null);
  const [isPickingDay, setIsPickingDay] = useState(false);
  const isToday = day === today;
  const padDate = formatPadDate(day);

  return (
    <HeaderBar>
      <View style={styles.pageTurns}>
        <HeaderButton
          label="‹"
          accessibilityLabel="Previous page"
          onPress={() => onShowDay(addDays(day, -1))}
        />
        <HeaderButton
          ref={date}
          label={padDate}
          accessibilityLabel={`${padDate} — choose a day`}
          themeColor={isToday ? 'textSecondary' : 'accent'}
          onPress={() => setIsPickingDay(true)}
        />
        {!isToday && (
          <HeaderButton
            label="›"
            accessibilityLabel="Next page"
            onPress={() => onShowDay(addDays(day, 1))}
          />
        )}
      </View>
      <HeaderButton label="⚙︎" accessibilityLabel="Settings" onPress={onOpenSettings} />
      {isPickingDay && (
        <Popover
          anchor={date}
          width={DATE_PICKER_WIDTH * scale}
          closeLabel="Close the calendar"
          onClose={() => setIsPickingDay(false)}>
          <DatePicker
            selected={day}
            today={today}
            onSelect={(picked) => {
              onShowDay(picked);
              setIsPickingDay(false);
            }}
          />
        </Popover>
      )}
    </HeaderBar>
  );
}

const styles = StyleSheet.create({
  pageTurns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
