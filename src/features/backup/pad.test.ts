import { useEventsStore } from '@/features/events/store';
import { seedGoals } from '@/features/goals/logic';
import { useGoalsStore } from '@/features/goals/store';
import { useGratitudeStore } from '@/features/gratitude/store';
import { todayKey } from '@/lib/dates';

import { parsePad, serializePad } from './logic';
import { readPad, writePad } from './pad';
import type { PadData } from './types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const NOW = '2026-08-27T07:30:00.000Z';

const written: PadData = {
  goals: {
    templates: [
      {
        id: 't1',
        cadence: 'daily',
        title: 'Deep Work',
        targetCount: 1,
        sortOrder: 1,
        updatedAt: NOW,
      },
    ],
    entries: [
      {
        id: 't1:2026-08-26',
        templateId: 't1',
        cadence: 'daily',
        periodKey: '2026-08-26',
        title: 'Deep Work',
        checks: ['done'],
        starred: true,
        sortOrder: 1,
        updatedAt: NOW,
      },
    ],
    tombstones: { 't1:2026-08-25': NOW },
  },
  gratitude: {
    entries: {
      '2026-08-25': { forDate: '2026-08-25', writtenAt: '2026-08-26T07:00:00.000Z', text: 'Amy' },
    },
    tombstones: {},
  },
  events: {
    events: [{ id: 'ev1', date: '2026-08-30', title: 'IRC', timeLabel: '4pm', updatedAt: NOW }],
    tombstones: { ev0: NOW },
  },
};

function freshInstall() {
  useGoalsStore.setState(seedGoals());
  useGratitudeStore.setState({ entries: {}, tombstones: {} });
  useEventsStore.setState({ events: [], tombstones: {} });
}

// serializePad/parsePad are covered in logic.test.ts; this checks the store wiring.
describe('readPad / writePad', () => {
  it('exports the whole pad and reproduces it on a fresh install', () => {
    freshInstall();
    writePad(written);
    const exported = readPad();
    // An import lands with today's page written, so the pad gains one line beyond what was in the file.
    expect(exported.goals.entries.map((e) => e.periodKey)).toEqual(['2026-08-26', todayKey()]);
    const file = serializePad(exported, NOW);

    freshInstall();
    expect(readPad().goals.entries).toHaveLength(0);

    const parsed = parsePad(file, NOW);
    if (!parsed.ok) throw new Error(parsed.reason);
    writePad(parsed.pad);
    expect(readPad()).toEqual(exported);
  });
});
