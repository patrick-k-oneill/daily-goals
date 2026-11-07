import { NativeModule, requireOptionalNativeModule } from 'expo';

export type IcloudPadEvents = {
  /** Files under the pad directory changed — another device wrote, or a download landed. */
  changed: (event: { paths: string[] }) => void;
  /** The device signed in to or out of iCloud. */
  availability: (event: { available: boolean }) => void;
};

/**
 * The pad directory in the app's iCloud container: discovered through a
 * metadata query, downloaded on demand, read and written under file
 * coordination — the three things iOS requires of iCloud Drive documents.
 */
export declare class IcloudPadModule extends NativeModule<IcloudPadEvents> {
  /** Whether an iCloud account is signed in on this device. */
  isAvailable(): Promise<boolean>;
  /** Watch `directory` in the container root; resolves once the first gathering is done. */
  start(directory: string): Promise<void>;
  stop(): Promise<void>;
  /** Every file's text by path, conflict copies as `path@n`, plus the paths that couldn't be read. */
  readAll(): Promise<{ files: Record<string, string>; skipped: string[] }>;
  write(path: string, text: string): Promise<void>;
}

/** Null where the module isn't linked: web, Expo Go, or a build made without it. */
export default requireOptionalNativeModule<IcloudPadModule>('IcloudPad');
