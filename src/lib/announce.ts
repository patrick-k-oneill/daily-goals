import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Speak a change to VoiceOver, after whatever it is already saying. Android
 * and web announce a changed `aria-live` text themselves.
 */
export function announce(message: string) {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  }
}
