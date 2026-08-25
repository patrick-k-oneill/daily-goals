import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { createJSONStorage, type PersistOptions } from 'zustand/middleware';

/**
 * The one place persistence is configured: AsyncStorage (localStorage on web,
 * native storage on iOS/Android) under a namespaced key. Swapping the storage
 * engine or adding a migration happens here or in the caller's `migrate`.
 */
export function persistOptions<S>(
  name: string,
  options: Pick<PersistOptions<S>, 'version' | 'migrate'> = {},
): PersistOptions<S> {
  return {
    name: `daily-goals/${name}`,
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
    ...options,
  };
}

interface HydratingStore {
  persist: {
    hasHydrated(): boolean;
    onFinishHydration(listener: () => void): () => void;
  };
}

/** True once every store has rehydrated from storage; false during static render. */
export function useHydrated(stores: readonly HydratingStore[]): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const unsubscribes = stores.map((store) => store.persist.onFinishHydration(onChange));
      return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    },
    () => stores.every((store) => store.persist.hasHydrated()),
    () => false,
  );
}
