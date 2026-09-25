import {
  addEvent,
  mergeEvents,
  removeEvent,
  upcomingEvents,
  updateEvent,
  upgradeLegacyEvents,
} from './logic';
import type { UpcomingEvent, UpcomingEvents } from './types';

const NOW = '2026-08-21T09:00:00.000Z';
const LATER = '2026-08-21T10:00:00.000Z';

function event(overrides: Partial<UpcomingEvent> = {}): UpcomingEvent {
  return {
    id: 'ev1',
    date: '2026-08-23',
    title: 'IRC',
    timeLabel: '4pm–5:30pm',
    note: 'omg lol',
    updatedAt: NOW,
    ...overrides,
  };
}

function jotted(...events: UpcomingEvent[]): UpcomingEvents {
  return { events, tombstones: {} };
}

describe('addEvent', () => {
  it('jots a trimmed, stamped event at the end, dropping blank optionals', () => {
    const { events } = addEvent(
      jotted(event()),
      { date: '2026-08-24', title: '  Dinner ', timeLabel: '   ', note: ' bring wine ' },
      LATER,
    );
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      date: '2026-08-24',
      title: 'Dinner',
      note: 'bring wine',
      updatedAt: LATER,
    });
    expect(events[1].timeLabel).toBeUndefined();
    expect(events[1].id).toBeTruthy();
  });

  it('jots nothing for a blank title', () => {
    const upcoming = jotted(event());
    expect(addEvent(upcoming, { date: '2026-08-24', title: '  ' }, NOW)).toBe(upcoming);
  });
});

describe('updateEvent', () => {
  it('updates every field, trimming like addEvent, and stamps the write', () => {
    const [updated] = updateEvent(
      jotted(event()),
      'ev1',
      { date: '2026-08-24', title: '  Dinner  ', timeLabel: ' 7pm ', note: '  bring wine  ' },
      LATER,
    ).events;
    expect(updated).toEqual({
      id: 'ev1',
      date: '2026-08-24',
      title: 'Dinner',
      timeLabel: '7pm',
      note: 'bring wine',
      updatedAt: LATER,
    });
  });

  it('drops time and note when a patch blanks them', () => {
    const [updated] = updateEvent(
      jotted(event()),
      'ev1',
      { timeLabel: '   ', note: '' },
      NOW,
    ).events;
    expect(updated.timeLabel).toBeUndefined();
    expect(updated.note).toBeUndefined();
  });

  it('leaves fields absent from the patch untouched', () => {
    const [updated] = updateEvent(jotted(event()), 'ev1', { title: 'Renamed' }, NOW).events;
    expect(updated.date).toBe('2026-08-23');
    expect(updated.timeLabel).toBe('4pm–5:30pm');
    expect(updated.note).toBe('omg lol');
  });

  it('is a no-op when the patch blanks the title', () => {
    const upcoming = jotted(event());
    expect(updateEvent(upcoming, 'ev1', { title: '   ', note: 'kept?' }, NOW)).toBe(upcoming);
  });

  it('only touches the matching event and ignores unknown ids', () => {
    const upcoming = jotted(event(), event({ id: 'ev2', title: 'Other' }));
    const updated = updateEvent(upcoming, 'ev2', { title: 'Renamed' }, NOW);
    expect(updated.events[0]).toEqual(upcoming.events[0]);
    expect(updated.events[1].title).toBe('Renamed');
    expect(updateEvent(upcoming, 'missing', { title: 'X' }, NOW)).toBe(upcoming);
  });
});

describe('removeEvent', () => {
  it('scratches out the matching event, leaving a tombstone, and ignores unknown ids', () => {
    const upcoming = jotted(event(), event({ id: 'ev2' }));
    const removed = removeEvent(upcoming, 'ev1', LATER);
    expect(removed.events.map((e) => e.id)).toEqual(['ev2']);
    expect(removed.tombstones).toEqual({ ev1: LATER });
    expect(removeEvent(upcoming, 'missing', LATER)).toBe(upcoming);
  });
});

describe('mergeEvents', () => {
  it('keeps what each device jotted, the later write of a shared event, and scratch-outs', () => {
    const phone = removeEvent(
      jotted(event({ id: 'shared', title: 'Phone title' }), event({ id: 'gone' })),
      'gone',
      LATER,
    );
    const ipad = jotted(
      event({ id: 'shared', title: 'iPad title', updatedAt: LATER }),
      event({ id: 'gone' }),
      event({ id: 'only-ipad' }),
    );
    const merged = mergeEvents(phone, ipad);
    expect(merged.events.map((e) => [e.id, e.title])).toEqual([
      ['only-ipad', 'IRC'],
      ['shared', 'iPad title'],
    ]);
    expect(merged.tombstones).toEqual({ gone: LATER });
    expect(merged).toEqual(mergeEvents(ipad, phone));
  });
});

describe('upgradeLegacyEvents', () => {
  it('stamps every event with the moment of the upgrade, with nothing scratched out', () => {
    const upgraded = upgradeLegacyEvents(
      [{ id: 'ev1', date: '2026-08-23', title: 'IRC', timeLabel: '4pm' }],
      NOW,
    );
    expect(upgraded).toEqual({
      events: [{ id: 'ev1', date: '2026-08-23', title: 'IRC', timeLabel: '4pm', updatedAt: NOW }],
      tombstones: {},
    });
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
