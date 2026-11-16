import { useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistOptions } from '@/lib/persisted-store';
import { useSystemFontScale } from '@/lib/system-font-scale';

import ZoomMenu from '../../../modules/zoom-menu';

import * as logic from './logic';

interface TextSizeState {
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
}

const hasZoomMenu = ZoomMenu?.isSupported() ?? false;

export const useTextSizeStore = create<TextSizeState>()(
  persist(
    (set) => ({
      zoom: logic.DEFAULT_TEXT_SCALE,
      zoomIn: () => set((s) => ({ zoom: logic.zoomedIn(s.zoom) })),
      zoomOut: () => set((s) => ({ zoom: logic.zoomedOut(s.zoom) })),
    }),
    persistOptions<TextSizeState>('text-size', {
      merge: (persisted, current) => ({
        ...current,
        zoom: logic.validTextScale((persisted as Partial<TextSizeState> | undefined)?.zoom),
      }),
    }),
  ),
);

export function useTextScale(): number {
  const systemFontScale = useSystemFontScale();
  const zoom = useTextSizeStore((s) => s.zoom);
  return logic.textScale(systemFontScale, hasZoomMenu ? zoom : logic.DEFAULT_TEXT_SCALE);
}

export function useZoomMenu() {
  const zoom = useTextSizeStore((s) => s.zoom);

  useEffect(() => {
    if (!hasZoomMenu) return undefined;
    const subscription = ZoomMenu?.addListener('zoom', ({ direction }) => {
      const { zoomIn, zoomOut } = useTextSizeStore.getState();
      if (direction === 'in') zoomIn();
      else zoomOut();
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (hasZoomMenu) ZoomMenu?.setLimits(logic.canZoomIn(zoom), logic.canZoomOut(zoom));
  }, [zoom]);
}
