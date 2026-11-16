import { useSyncExternalStore } from 'react';

const BROWSER_DEFAULT_FONT_SIZE = 16;

let rootFontScale: number | undefined;

function subscribe() {
  return () => {};
}

function systemFontScale(): number {
  rootFontScale ??=
    parseFloat(getComputedStyle(document.documentElement).fontSize) / BROWSER_DEFAULT_FONT_SIZE;
  return rootFontScale;
}

function defaultFontScale(): number {
  return 1;
}

export function useSystemFontScale(): number {
  return useSyncExternalStore(subscribe, systemFontScale, defaultFontScale);
}
