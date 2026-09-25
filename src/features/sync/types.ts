import type { PadData } from '@/features/backup/types';

/** The cloud pad as read or written: the text of each file, by its path under the pad directory. */
export type CloudFiles = Record<string, string>;

/** What a pull read: the pad the readable files hold, and the paths that couldn't be read into shape. */
export interface CloudPad {
  pad: PadData;
  /** Damaged, or written by a newer app: merged from nothing, never overwritten. */
  unreadable: string[];
}

/** What the device handed back from the pad directory. */
export interface CloudRead {
  files: CloudFiles;
  /** Files iCloud has but this device couldn't download or read: never overwritten. */
  skipped: string[];
}

export type CloudEvent = 'changed' | 'availability';

/** The pad directory in iCloud Drive as the engine sees it; `cloud.ts` binds it to the device. */
export interface CloudBinding {
  /** Whether this device is signed in to iCloud; the engine rests otherwise. */
  isAvailable(): Promise<boolean>;
  /** Start watching the directory, so `subscribe` hears other devices' writes. */
  start(): Promise<void>;
  stop(): void;
  /** Every file in the directory, downloaded and read, conflict copies included as `path@n`. */
  readAll(): Promise<CloudRead>;
  write(path: string, text: string): Promise<void>;
  /** Another device wrote, or iCloud availability changed. */
  subscribe(listener: (event: CloudEvent) => void): () => void;
}

export type SyncPhase = 'starting' | 'syncing' | 'synced' | 'unavailable' | 'error';
