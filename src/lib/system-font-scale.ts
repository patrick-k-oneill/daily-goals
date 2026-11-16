import { useSyncExternalStore } from 'react';
import { Dimensions, PixelRatio } from 'react-native';

function subscribe(onChange: () => void) {
  // react-doctor-disable-next-line react-doctor/rn-no-dimensions-get
  const subscription = Dimensions.addEventListener('change', onChange);
  return () => subscription.remove();
}

function systemFontScale(): number {
  return PixelRatio.getFontScale();
}

function defaultFontScale(): number {
  return 1;
}

export function useSystemFontScale(): number {
  return useSyncExternalStore(subscribe, systemFontScale, defaultFontScale);
}
