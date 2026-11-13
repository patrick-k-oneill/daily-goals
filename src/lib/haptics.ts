import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function selectionTap() {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync().catch(() => {});
  }
}

export function successBuzz() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }
}
