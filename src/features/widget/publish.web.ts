import type { SnapshotEntry } from './types';

/** The web pad has no Home Screen widget. */
export const hasWidget = false;

export async function publishTimeline(_timeline: SnapshotEntry[]): Promise<void> {}
