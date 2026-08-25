import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/confirm';
import { useToday } from '@/lib/clock';
import {
  addDays,
  formatDayLong,
  formatDayShort,
  WEEKDAY_LABELS,
  weekdayIndex,
  type DayKey,
} from '@/lib/dates';

import { upcomingEvents, useEventsStore } from '../store';
import type { UpcomingEvent } from '../types';

/** The bottom-of-page jottings: "Sun 8/23: IRC @ 4pm–5:30pm". */
export function UpcomingEvents() {
  const theme = useTheme();
  const events = useEventsStore((s) => s.events);
  const today = useToday();

  const upcoming = upcomingEvents(events, today);

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
  const updateEvent = useEventsStore((s) => s.updateEvent);
  const [editing, setEditing] = useState(false);

  const confirmRemove = () =>
    confirmAction('Remove event', `Remove “${event.title}”?`, () => removeEvent(event.id));

  if (editing) {
    return (
      <EventForm
        initial={{
          date: event.date,
          title: event.title,
          timeLabel: event.timeLabel ?? '',
          note: event.note ?? '',
        }}
        submitLabel="Save"
        onSubmit={(draft) => {
          updateEvent(event.id, draft);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const dayLabel = `${WEEKDAY_LABELS[weekdayIndex(event.date)]} ${formatDayShort(event.date)}`;

  return (
    <View style={[styles.eventRow, { borderBottomColor: theme.rule }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${event.title}`}
        onPress={() => setEditing(true)}
        onLongPress={confirmRemove}
        delayLongPress={400}
        style={styles.eventBody}>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${event.title}`}
        onPress={confirmRemove}
        style={styles.removeButton}>
        {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
          <ThemedText
            themeColor={pressed || hovered ? 'missed' : 'textSecondary'}
            style={styles.removeGlyph}>
            ×
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

interface EventDraft {
  date: DayKey;
  title: string;
  timeLabel: string;
  note: string;
}

/** The inline jotting form, shared by "+ Add event" and tap-to-edit. */
function EventForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: EventDraft;
  submitLabel: string;
  onSubmit: (draft: EventDraft) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();

  // Draft snapshot, intentional: the form mounts fresh per add/edit session
  // and nothing mutates the event while it's open, so resyncing would be wrong.
  // react-doctor-disable-next-line react-doctor/no-derived-useState
  const [draft, setDraft] = useState(initial);
  const patchDraft = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const today = useToday();
  const nextWeek = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const canSubmit = Boolean(draft.title.trim());

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(draft);
  };

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
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={submit}
          style={[
            styles.submitButton,
            { backgroundColor: theme.accent },
            !canSubmit && styles.buttonDisabled,
          ]}>
          <ThemedText type="smallBold" style={styles.submitLabel}>
            {submitLabel}
          </ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={8}>
          <ThemedText type="small" themeColor="textSecondary">
            Cancel
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function AddEventRow() {
  const addEvent = useEventsStore((s) => s.addEvent);
  const today = useToday();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add an event"
        onPress={() => setOpen(true)}
        style={styles.collapsed}>
        <ThemedText type="small" themeColor="textSecondary">
          + Add event
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <EventForm
      initial={{ date: today, title: '', timeLabel: '', note: '' }}
      submitLabel="Add"
      onSubmit={(draft) => {
        addEvent(draft);
        setOpen(false);
      }}
      onCancel={() => setOpen(false)}
    />
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
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eventBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
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
  // A real 44×44pt box (hitSlop doesn't extend DOM hit areas on web); negative
  // margins keep the old 28×28pt visual footprint. The × is the later sibling,
  // so it wins hit-testing where it overhangs the row body.
  removeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    margin: -8,
  },
  removeGlyph: {
    fontSize: 20,
    lineHeight: 24,
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
  submitButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  submitLabel: {
    color: '#FFFFFF',
  },
});
