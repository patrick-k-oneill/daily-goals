import { applyEventUpdate } from './logic';
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

describe('applyEventUpdate', () => {
  it('updates every field, trimming like addEvent', () => {
    const [updated] = applyEventUpdate([event()], 'ev1', {
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
    const [updated] = applyEventUpdate([event()], 'ev1', { timeLabel: '   ', note: '' });
    expect(updated.timeLabel).toBeUndefined();
    expect(updated.note).toBeUndefined();
  });

  it('leaves fields absent from the patch untouched', () => {
    const [updated] = applyEventUpdate([event()], 'ev1', { title: 'Renamed' });
    expect(updated.date).toBe('2026-08-23');
    expect(updated.timeLabel).toBe('4pm–5:30pm');
    expect(updated.note).toBe('omg lol');
  });

  it('is a no-op when the patch blanks the title', () => {
    const events = [event()];
    expect(applyEventUpdate(events, 'ev1', { title: '   ', note: 'kept?' })).toBe(events);
  });

  it('only touches the matching event and ignores unknown ids', () => {
    const events = [event(), event({ id: 'ev2', title: 'Other' })];
    const updated = applyEventUpdate(events, 'ev2', { title: 'Renamed' });
    expect(updated[0]).toEqual(events[0]);
    expect(updated[1].title).toBe('Renamed');
    expect(applyEventUpdate(events, 'missing', { title: 'X' })).toEqual(events);
  });
});
