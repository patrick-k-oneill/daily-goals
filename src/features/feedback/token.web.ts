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
  // The one place a browser can keep it (ADR 0010); the token is scoped to this repo's issues.
  // react-doctor-disable-next-line react-doctor/auth-token-in-web-storage
  localStorage.setItem(KEY, token);
}

export async function forgetToken(): Promise<void> {
  localStorage.removeItem(KEY);
}
