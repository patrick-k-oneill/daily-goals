import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/lib/persisted-store';

import * as logic from './logic';

interface TextSizeState {
  scale: number;
  enlargeText: () => void;
  shrinkText: () => void;
  resetTextSize: () => void;
}

/** This device's text size: a local preference, never part of the pad, its file or sync. */
export const useTextSizeStore = create<TextSizeState>()(
  persist(
    (set) => ({
      scale: logic.DEFAULT_TEXT_SCALE,
      enlargeText: () => set((s) => ({ scale: logic.largerTextScale(s.scale) })),
      shrinkText: () => set((s) => ({ scale: logic.smallerTextScale(s.scale) })),
      resetTextSize: () => set({ scale: logic.DEFAULT_TEXT_SCALE }),
    }),
    persistOptions<TextSizeState>('text-size'),
  ),
);

/** The multiplier every text style on screen renders at. */
export function useTextScale(): number {
  return useTextSizeStore((s) => s.scale);
}
