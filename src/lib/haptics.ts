import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function selectionTap() {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {});
  }
}

/** A row lifting off the page under a long press. */
export function liftTap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

/** A lifted row settling back onto the page. */
export function dropTap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}
