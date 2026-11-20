import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import type { DayKey } from '@/lib/dates';

import { buildIssue, filedOutcome, issueRequest, newIssueUrl } from './logic';
import { readToken } from './token';
import type { SendOutcome } from './types';

const TOO_LONG_FOR_THE_BROWSER =
  'This note is too long to hand to the browser. Shorten it, or add a GitHub token.';

/**
 * File a note as an issue: through the GitHub API when a token is saved,
 * otherwise by opening GitHub's new-issue page with the note filled in. On
 * web that page opens in a new tab; nothing is awaited before it opens, so
 * the browser counts it as the user's own tap and doesn't block it.
 */
export async function sendFeedback(text: string, day: DayKey): Promise<SendOutcome> {
  const issue = buildIssue(text, {
    platform: Platform.OS,
    osVersion: Platform.OS === 'web' ? undefined : String(Platform.Version),
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    day,
  });
  if (!issue) return { ok: false, message: 'Write a note first.' };

  const token = readToken();
  try {
    if (!token) {
      const url = newIssueUrl(issue);
      if (!url) return { ok: false, message: TOO_LONG_FOR_THE_BROWSER };
      await Linking.openURL(url);
      return { ok: true, message: 'Opened GitHub to file it.' };
    }
    const { url, init } = issueRequest(issue, token);
    const response = await fetch(url, init);
    const answer = response.ok ? await response.json().catch(() => null) : null;
    return filedOutcome(response.status, answer);
  } catch {
    return { ok: false, message: 'Couldn’t reach GitHub.' };
  }
}
