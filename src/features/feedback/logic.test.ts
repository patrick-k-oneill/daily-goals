import {
  buildIssue,
  canSend,
  EMPTY_DRAFT,
  filedOutcome,
  issueRequest,
  MAX_PREFILL_URL_LENGTH,
  MAX_TITLE_LENGTH,
  newIssueUrl,
} from './logic';
import type { FeedbackContext, FeedbackIssue } from './types';

const CONTEXT: FeedbackContext = {
  platform: 'ios',
  osVersion: '27.0',
  appVersion: '1.0.0',
  day: '2026-11-13',
};
const FOOTER = '---\nDaily Goals 1.0.0 · ios 27.0 · 2026-11-13';

const ISSUE: FeedbackIssue = {
  title: 'Checks & labels overlap?',
  body: `On the weekly row.\n\n${FOOTER}`,
  labels: ['needs-triage'],
};

describe('canSend', () => {
  it('refuses a note without a title', () => {
    expect(canSend(EMPTY_DRAFT)).toBe(false);
    expect(canSend({ title: '  ', description: 'On the weekly row.' })).toBe(false);
    expect(canSend({ title: ' a ', description: '' })).toBe(true);
  });
});

describe('buildIssue', () => {
  it('files the title as the issue title and the description above the context footer', () => {
    expect(
      buildIssue(
        {
          title: '  Checks overlap ',
          description: 'On the weekly row.\n\nOnly at phone width.\n',
        },
        CONTEXT,
      ),
    ).toEqual({
      title: 'Checks overlap',
      body: `On the weekly row.\n\nOnly at phone width.\n\n${FOOTER}`,
      labels: ['needs-triage'],
    });
  });

  it('files a note without a description with the footer alone as its body', () => {
    expect(buildIssue({ title: 'Checks overlap', description: ' \n' }, CONTEXT)).toMatchObject({
      title: 'Checks overlap',
      body: FOOTER,
    });
  });

  it('cuts a title too long for an issue and keeps it whole above the description', () => {
    const longTitle = 'word '.repeat(20).trim();
    const issue = buildIssue({ title: longTitle, description: 'Second line.' }, CONTEXT);
    expect(issue?.title).toHaveLength(MAX_TITLE_LENGTH);
    expect(issue?.title.endsWith('…')).toBe(true);
    expect(longTitle.startsWith(issue?.title.slice(0, -1) ?? 'x')).toBe(true);
    expect(issue?.body).toBe(`${longTitle}\n\nSecond line.\n\n${FOOTER}`);
    expect(buildIssue({ title: longTitle, description: '' }, CONTEXT)?.body).toBe(
      `${longTitle}\n\n${FOOTER}`,
    );
  });

  it('never cuts a title through the middle of an emoji', () => {
    const issue = buildIssue(
      { title: `${'a'.repeat(MAX_TITLE_LENGTH - 2)}😀😀😀`, description: '' },
      CONTEXT,
    );
    expect(issue?.title).toBe(`${'a'.repeat(MAX_TITLE_LENGTH - 2)}😀…`);
    expect(() => encodeURIComponent(issue?.title ?? '')).not.toThrow();
  });

  it('keeps a title of exactly the title length whole', () => {
    const title = 'a'.repeat(MAX_TITLE_LENGTH);
    expect(buildIssue({ title, description: '' }, CONTEXT)).toMatchObject({ title, body: FOOTER });
  });

  it('leaves the OS version out of the footer where there is none', () => {
    const web = { ...CONTEXT, platform: 'web', osVersion: undefined };
    expect(buildIssue({ title: 'Checks overlap', description: '' }, web)?.body).toBe(
      '---\nDaily Goals 1.0.0 · web · 2026-11-13',
    );
  });

  it('shapes nothing from a note without a title', () => {
    expect(buildIssue({ title: ' ', description: 'On the weekly row.' }, CONTEXT)).toBeNull();
  });
});

describe('newIssueUrl', () => {
  it('prefills GitHub’s new-issue page with the title, body and label', () => {
    const url = new URL(newIssueUrl(ISSUE) ?? '');
    expect(`${url.origin}${url.pathname}`).toBe(
      'https://github.com/patrick-k-oneill/daily-goals/issues/new',
    );
    expect(url.searchParams.get('title')).toBe(ISSUE.title);
    expect(url.searchParams.get('body')).toBe(ISSUE.body);
    expect(url.searchParams.get('labels')).toBe('needs-triage');
  });

  it('gives no address for a note too long for GitHub to accept in one', () => {
    const fitting = { ...ISSUE, body: 'a'.repeat(MAX_PREFILL_URL_LENGTH - 200) };
    expect(newIssueUrl(fitting)?.length).toBeLessThanOrEqual(MAX_PREFILL_URL_LENGTH);
    expect(newIssueUrl({ ...ISSUE, body: 'a'.repeat(MAX_PREFILL_URL_LENGTH) })).toBeNull();
    // A space takes three characters of the address.
    expect(newIssueUrl({ ...ISSUE, body: ' '.repeat(MAX_PREFILL_URL_LENGTH / 3) })).toBeNull();
  });

  it('escapes what would break the query', () => {
    expect(newIssueUrl(ISSUE)).toContain('title=Checks%20%26%20labels%20overlap%3F&body=');
  });
});

describe('issueRequest', () => {
  it('posts the issue to the repo with the token as a bearer', () => {
    const { url, init } = issueRequest(ISSUE, 'token-123');
    expect(url).toBe('https://api.github.com/repos/patrick-k-oneill/daily-goals/issues');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer token-123',
    });
    expect(JSON.parse(String(init.body))).toEqual(ISSUE);
  });
});

describe('filedOutcome', () => {
  it('reports the number of the issue GitHub created', () => {
    expect(filedOutcome(201, { number: 123 })).toEqual({ ok: true, message: 'Filed #123' });
    expect(filedOutcome(201, null)).toEqual({ ok: true, message: 'Filed.' });
  });

  it('says why GitHub did not file it', () => {
    expect(filedOutcome(401, { message: 'Bad credentials' })).toEqual({
      ok: false,
      message: 'GitHub didn’t accept the token.',
    });
    expect(filedOutcome(403, null).message).toBe('The token can’t file issues on this repo.');
    expect(filedOutcome(404, null).message).toBe('The token can’t file issues on this repo.');
    expect(filedOutcome(500, null)).toEqual({
      ok: false,
      message: 'GitHub couldn’t file it (500).',
    });
  });
});
