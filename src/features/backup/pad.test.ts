import { useEventsStore } from '@/features/events/store';
import { seedGoals } from '@/features/goals/logic';
import { useGoalsStore } from '@/features/goals/store';
import { useGratitudeStore } from '@/features/gratitude/store';

import { parsePad, serializePad } from './logic';
import { readPad, writePad } from './pad';
import type { PadData } from './types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const written: PadData = {
  goals: {
    templates: [
      {
        id: 't1',
        cadence: 'daily',
        title: 'Deep Work',
        targetCount: 1,
        active: true,
        sortOrder: 1,
      },
    ],
    entries: [
      {
        id: 'e1',
        templateId: 't1',
        cadence: 'daily',
        periodKey: '2026-08-26',
        title: 'Deep Work',
        checks: ['done'],
        starred: true,
        sortOrder: 1,
      },
    ],
  },
  gratitude: {
    '2026-08-25': { forDate: '2026-08-25', writtenAt: '2026-08-26T07:00:00.000Z', text: 'Amy' },
  },
  events: [{ id: 'ev1', date: '2026-08-30', title: 'IRC', timeLabel: '4pm' }],
};

function freshInstall() {
  useGoalsStore.setState(seedGoals());
  useGratitudeStore.setState({ entries: {} });
  useEventsStore.setState({ events: [] });
}

// serializePad/parsePad are covered in logic.test.ts; this checks the store wiring.
describe('readPad / writePad', () => {
  it('exports the whole pad and reproduces it on a fresh install', () => {
    freshInstall();
    writePad(written);
    const file = serializePad(readPad(), '2026-08-27T07:30:00.000Z');

    freshInstall();
    expect(readPad().goals.entries).toHaveLength(0);

    const parsed = parsePad(file);
    if (!parsed.ok) throw new Error(parsed.reason);
    writePad(parsed.pad);
    expect(readPad()).toEqual(written);
  });
});
