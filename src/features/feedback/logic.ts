import type { FeedbackContext, FeedbackIssue, SendOutcome } from './types';

const REPO = 'patrick-k-oneill/daily-goals';
const TRIAGE_LABEL = 'needs-triage';
/** An issue title holds at most this many characters. */
export const MAX_TITLE_LENGTH = 72;
/** GitHub answers a longer address with an error page and no filled-in note. */
export const MAX_PREFILL_URL_LENGTH = 6000;

/** Whether a note has anything to send. */
export function canSend(text: string): boolean {
  return text.trim() !== '';
}

/**
 * Shape a note as an issue: its first line is the title, the rest the body,
 * closed by a footer saying where it was written. A first line too long for a
 * title is cut with an ellipsis and the whole note becomes the body, so
 * nothing is lost. The cut counts whole characters, never half of an emoji.
 * A blank note shapes nothing.
 */
export function buildIssue(text: string, context: FeedbackContext): FeedbackIssue | null {
  if (!canSend(text)) return null;
  const note = text.trim();
  const [firstLine, ...rest] = note.split('\n');
  const heading = firstLine.trim();
  const characters = Array.from(heading);
  const fits = characters.length <= MAX_TITLE_LENGTH;
  const title = fits
    ? heading
    : `${characters
        .slice(0, MAX_TITLE_LENGTH - 1)
        .join('')
        .trimEnd()}…`;
  const detail = fits ? rest.join('\n').trim() : note;
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
