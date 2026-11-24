import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { syncNow } from './store';

const BACKGROUND_SYNC_TASK = 'icloud-pad-sync';
const MINIMUM_INTERVAL_MINUTES = 15;

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    await syncNow();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: MINIMUM_INTERVAL_MINUTES,
  });
}

/**
 * Ask iOS to wake the app now and then while it is in the background, to pull
 * and push, so the pad is usually current when it is next opened (#99). iOS
 * picks the moments and may pick none: the pull at launch stays the floor.
 */
export function useBackgroundSync() {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    registerBackgroundSync().catch(() => {});
  }, []);
}
