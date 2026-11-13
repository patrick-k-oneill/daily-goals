import * as SecureStore from 'expo-secure-store';

const KEY = 'github-feedback-token';
// Readable only while the device is unlocked, and left out of backups and device transfers.
const OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/** The saved GitHub token, or null when there is none or the Keychain can't be read. */
export function readToken(): string | null {
  try {
    return SecureStore.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  SecureStore.setItem(KEY, token, OPTIONS);
}

export async function forgetToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
