import type { FeedbackContext, FeedbackDraft, FeedbackIssue, SendOutcome } from './types';

const REPO = 'patrick-k-oneill/daily-goals';
const TRIAGE_LABEL = 'needs-triage';
/** An issue title holds at most this many characters. */
export const MAX_TITLE_LENGTH = 72;
/** GitHub answers a longer address with an error page and no filled-in note. */
export const MAX_PREFILL_URL_LENGTH = 6000;

export const EMPTY_DRAFT: FeedbackDraft = { title: '', description: '' };

/** Whether a note has a title to send it under. */
export function canSend(draft: FeedbackDraft): boolean {
  return draft.title.trim() !== '';
}

/**
 * Shape a note as an issue: its title, and its description as the body,
 * closed by a footer saying where it was written. A title too long for an
 * issue is cut with an ellipsis and goes whole above the description, so
 * nothing is lost. The cut counts whole characters, never half of an emoji.
 * A note without a title shapes nothing.
 */
export function buildIssue(draft: FeedbackDraft, context: FeedbackContext): FeedbackIssue | null {
  if (!canSend(draft)) return null;
  const heading = draft.title.trim();
  const description = draft.description.trim();
  const characters = Array.from(heading);
  const fits = characters.length <= MAX_TITLE_LENGTH;
  const title = fits
    ? heading
    : `${characters
        .slice(0, MAX_TITLE_LENGTH - 1)
        .join('')
        .trimEnd()}…`;
  const detail = fits ? description : [heading, description].filter(Boolean).join('\n\n');
  const footer = contextFooter(context);
  return { title, body: detail ? `${detail}\n\n${footer}` : footer, labels: [TRIAGE_LABEL] };
}

/**
 * GitHub's new-issue page with the issue filled in, for sending without a
 * token; null when the note makes the address too long for GitHub to accept.
 */
export function newIssueUrl(issue: FeedbackIssue): string | null {
  const query = [
    ['title', issue.title],
    ['body', issue.body],
    ['labels', issue.labels.join(',')],
  ]
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('&');
  const url = `https://github.com/${REPO}/issues/new?${query}`;
  return url.length <= MAX_PREFILL_URL_LENGTH ? url : null;
}

/** The GitHub API call that files the issue with a token. */
export function issueRequest(
  issue: FeedbackIssue,
  token: string,
): { url: string; init: RequestInit } {
  return {
    url: `https://api.github.com/repos/${REPO}/issues`,
    init: {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(issue),
    },
  };
}

/** What GitHub's answer to the API call means: the filed issue's number, or why it was not filed. */
export function filedOutcome(status: number, answer: unknown): SendOutcome {
  if (status === 201) {
    const number = isRecord(answer) ? answer.number : undefined;
    return { ok: true, message: typeof number === 'number' ? `Filed #${number}` : 'Filed.' };
  }
  if (status === 401) return refused('GitHub didn’t accept the token.');
  if (status === 403 || status === 404) return refused('The token can’t file issues on this repo.');
  return refused(`GitHub couldn’t file it (${status}).`);
}

function contextFooter({ platform, osVersion, appVersion, day }: FeedbackContext): string {
  const device = osVersion ? `${platform} ${osVersion}` : platform;
  return `---\nDaily Goals ${appVersion} · ${device} · ${day}`;
}

function refused(message: string): SendOutcome {
  return { ok: false, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
