import IcloudPad from '../../../modules/icloud-pad';

import type { CloudBinding } from './types';

/** The directory in the hidden root of the iCloud container that holds the cloud pad. */
const PAD_DIRECTORY = 'pad';

/**
 * The pad directory in this device's iCloud container, through the local
 * IcloudPad module. Where the module isn't linked — web, or a build without
 * it — iCloud is simply unavailable and the engine rests.
 */
export const cloudPad: CloudBinding = {
  isAvailable: () => IcloudPad?.isAvailable() ?? Promise.resolve(false),
  start: () => IcloudPad?.start(PAD_DIRECTORY) ?? Promise.resolve(),
  stop: () => void IcloudPad?.stop(),
  readAll: () => IcloudPad?.readAll() ?? Promise.resolve({ files: {}, skipped: [] }),
  write: (path, text) => IcloudPad?.write(path, text) ?? Promise.resolve(),
  subscribe: (listener) => {
    if (!IcloudPad) return () => {};
    const changed = IcloudPad.addListener('changed', () => listener('changed'));
    const availability = IcloudPad.addListener('availability', () => listener('availability'));
    return () => {
      changed.remove();
      availability.remove();
    };
  },
};
