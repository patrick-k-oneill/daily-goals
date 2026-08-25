import { addEvent, removeEvent, upcomingEvents, updateEvent } from './logic';
import type { UpcomingEvent } from './types';

function event(overrides: Partial<UpcomingEvent> = {}): UpcomingEvent {
  return {
    id: 'ev1',
    date: '2026-08-23',
    title: 'IRC',
    timeLabel: '4pm–5:30pm',
    note: 'omg lol',
    ...overrides,
  };
}

describe('addEvent', () => {
  it('jots a trimmed event at the end, dropping blank optionals', () => {
    const events = addEvent([event()], {
      date: '2026-08-24',
      title: '  Dinner ',
      timeLabel: '   ',
      note: ' bring wine ',
    });
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ date: '2026-08-24', title: 'Dinner', note: 'bring wine' });
    expect(events[1].timeLabel).toBeUndefined();
    expect(events[1].id).toBeTruthy();
  });

  it('jots nothing for a blank title', () => {
    const events = [event()];
    expect(addEvent(events, { date: '2026-08-24', title: '  ' })).toBe(events);
  });
});

describe('updateEvent', () => {
  it('updates every field, trimming like addEvent', () => {
    const [updated] = updateEvent([event()], 'ev1', {
      date: '2026-08-24',
      title: '  Dinner  ',
      timeLabel: ' 7pm ',
      note: '  bring wine  ',
    });
    expect(updated).toEqual({
      id: 'ev1',
      date: '2026-08-24',
      title: 'Dinner',
      timeLabel: '7pm',
      note: 'bring wine',
    });
  });

  it('drops time and note when a patch blanks them', () => {
    const [updated] = updateEvent([event()], 'ev1', { timeLabel: '   ', note: '' });
    expect(updated.timeLabel).toBeUndefined();
    expect(updated.note).toBeUndefined();
  });

  it('leaves fields absent from the patch untouched', () => {
    const [updated] = updateEvent([event()], 'ev1', { title: 'Renamed' });
    expect(updated.date).toBe('2026-08-23');
    expect(updated.timeLabel).toBe('4pm–5:30pm');
    expect(updated.note).toBe('omg lol');
  });

  it('is a no-op when the patch blanks the title', () => {
    const events = [event()];
    expect(updateEvent(events, 'ev1', { title: '   ', note: 'kept?' })).toBe(events);
  });

  it('only touches the matching event and ignores unknown ids', () => {
    const events = [event(), event({ id: 'ev2', title: 'Other' })];
    const updated = updateEvent(events, 'ev2', { title: 'Renamed' });
    expect(updated[0]).toEqual(events[0]);
    expect(updated[1].title).toBe('Renamed');
    expect(updateEvent(events, 'missing', { title: 'X' })).toBe(events);
  });
});

describe('removeEvent', () => {
  it('removes the matching event and ignores unknown ids', () => {
    const events = [event(), event({ id: 'ev2' })];
    expect(removeEvent(events, 'ev1').map((e) => e.id)).toEqual(['ev2']);
    expect(removeEvent(events, 'missing')).toBe(events);
  });
});

describe('upcomingEvents', () => {
  it('lists events from the given day on, soonest first, same-day alphabetical', () => {
    const events = [
      event({ id: 'past', date: '2026-08-20' }),
      event({ id: 'later', date: '2026-08-25', title: 'Dentist' }),
      event({ id: 'b', date: '2026-08-23', title: 'Zoo' }),
      event({ id: 'a', date: '2026-08-23', title: 'IRC' }),
      event({ id: 'today', date: '2026-08-21' }),
    ];
    expect(upcomingEvents(events, '2026-08-21').map((e) => e.id)).toEqual([
      'today',
      'a',
      'b',
      'later',
    ]);
  });
});
