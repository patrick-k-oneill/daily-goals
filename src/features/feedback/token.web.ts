const KEY = 'daily-goals/github-feedback-token';

/**
 * Browsers have no Keychain, so the token sits in localStorage. Null when
 * there is none or storage is unavailable (static render, blocked site data).
 */
export function readToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  localStorage.setItem(KEY, token);
}

export async function forgetToken(): Promise<void> {
  localStorage.removeItem(KEY);
}
