import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import {
  addDays,
  formatDayLong,
  formatDayShort,
  todayKey,
  WEEKDAY_LABELS,
  weekdayIndex,
  type DayKey,
} from '@/lib/dates';

import { upcomingEvents, useEventsStore } from '../store';
import type { UpcomingEvent } from '../types';

/** The bottom-of-page jottings: "Sun 8/23: IRC @ 4pm–5:30pm". */
export function UpcomingEvents() {
  const theme = useTheme();
  const hydrated = useEventsStore((s) => s.hydrated);
  const events = useEventsStore((s) => s.events);

  if (!hydrated) return null;

  const upcoming = upcomingEvents(events, todayKey());

  return (
    <View style={styles.section}>
      <View style={[styles.header, { borderBottomColor: theme.text }]}>
        <ThemedText type="handSmall">Upcoming</ThemedText>
      </View>
      {upcoming.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
      {upcoming.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          No events jotted down.
        </ThemedText>
      )}
      <AddEventRow />
    </View>
  );
}

function EventRow({ event }: { event: UpcomingEvent }) {
  const theme = useTheme();
  const removeEvent = useEventsStore((s) => s.removeEvent);

  const dayLabel = `${WEEKDAY_LABELS[weekdayIndex(event.date)]} ${formatDayShort(event.date)}`;

  return (
    <Pressable
      accessibilityRole="text"
      onLongPress={() =>
        confirmAction('Remove event', `Remove “${event.title}”?`, () => removeEvent(event.id))
      }
      delayLongPress={400}
      style={[styles.eventRow, { borderBottomColor: theme.rule }]}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.eventDay}>
        {dayLabel}
      </ThemedText>
      <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
      {event.timeLabel ? (
        <ThemedText type="small" themeColor="textSecondary">
          @ {event.timeLabel}
        </ThemedText>
      ) : null}
      {event.note ? (
        <ThemedText type="handSmall" themeColor="accent" style={styles.eventNote}>
          {event.note}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

interface EventDraft {
  date: DayKey;
  title: string;
  timeLabel: string;
  note: string;
}

function AddEventRow() {
  const theme = useTheme();
  const addEvent = useEventsStore((s) => s.addEvent);

  // One draft object; null means the form is closed.
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const patchDraft = (patch: Partial<EventDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const nextWeek = Array.from({ length: 7 }, (_, i) => addDays(todayKey(), i));

  const submit = () => {
    if (!draft?.title.trim()) return;
    addEvent(draft);
    setDraft(null);
  };

  if (!draft) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add an event"
        onPress={() => setDraft({ date: todayKey(), title: '', timeLabel: '', note: '' })}
        style={styles.collapsed}>
        <ThemedText type="small" themeColor="textSecondary">
          + Add event
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.form, { borderColor: theme.border }]}>
      <View style={styles.chipRow}>
        {nextWeek.map((day) => {
          const selected = day === draft.date;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={`Event on ${formatDayLong(day)}`}
              onPress={() => patchDraft({ date: day })}
              style={[
                styles.chip,
                { borderColor: selected ? theme.accent : theme.border },
                selected && { backgroundColor: theme.backgroundSelected },
              ]}>
              <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                {WEEKDAY_LABELS[weekdayIndex(day)]} {formatDayShort(day)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={draft.title}
        onChangeText={(title) => patchDraft({ title })}
        placeholder="Event name…"
        placeholderTextColor={theme.textSecondary}
        autoFocus
        style={[styles.input, { color: theme.text, borderBottomColor: theme.rule }]}
      />
      <TextInput
        value={draft.timeLabel}
        onChangeText={(timeLabel) => patchDraft({ timeLabel })}
        placeholder="Time, e.g. 4pm–5:30pm (optional)"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, borderBottomColor: theme.rule }]}
      />
      <TextInput
        value={draft.note}
        onChangeText={(note) => patchDraft({ note })}
        placeholder="Scribbled aside, e.g. omg lol (optional)"
        placeholderTextColor={theme.textSecondary}
        returnKeyType="done"
        onSubmitEditing={submit}
        style={[styles.input, { color: theme.text, borderBottomColor: theme.rule }]}
      />

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={submit}
          style={[styles.addButton, { backgroundColor: theme.accent }]}>
          <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
            Add
          </ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setDraft(null)} hitSlop={8}>
          <ThemedText type="small" themeColor="textSecondary">
            Cancel
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    borderBottomWidth: 2,
    paddingBottom: Spacing.half,
    alignSelf: 'flex-start',
  },
  empty: {
    paddingVertical: Spacing.one,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eventDay: {
    minWidth: 72,
  },
  eventTitle: {
    flexShrink: 1,
  },
  eventNote: {
    fontSize: 18,
    lineHeight: 22,
  },
  collapsed: {
    paddingVertical: Spacing.two,
  },
  form: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderRadius: Spacing.five,
  },
  input: {
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  addButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
});
