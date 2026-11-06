/** The marker a list line starts with, stored as-is so the text reads right wherever it is shown. */
export const BULLET = '• ';

/** Line starts a person types for a bullet, Apple Notes style. */
const TYPED_MARKERS = ['- ', '* '];

export interface TextSelection {
  start: number;
  end: number;
}

/** A rewrite of the input's text and where the caret belongs once it shows. */
export interface ListEdit {
  text: string;
  selection: TextSelection;
}

/** What focusing an empty input writes: the first bullet, caret after it. */
export function startList(): ListEdit {
  return { text: BULLET, selection: caretAt(BULLET.length) };
}

/**
 * The list rules applied to one keyboard edit, found by diffing the previous
 * text against what the input now holds. Return on a bullet line continues
 * the list, on an empty bullet ends it; deleting into a bullet's marker drops
 * the whole marker; "- " or "* " typed at a line start becomes a bullet.
 * Prose lines, pastes and replacements pass through unchanged.
 */
export function applyListEdit(prev: string, next: string): ListEdit {
  const { start, removed, inserted } = diffEdit(prev, next);
  const typed = { text: next, selection: caretAt(start + inserted.length) };
  if (inserted === '\n' && removed === '') return breakLine(prev, start) ?? typed;
  if (inserted === '' && removed.length === 1) return deleteChar(prev, start) ?? typed;
  if (inserted !== '' && !inserted.includes('\n')) {
    return recognizeBullet(next, start + inserted.length) ?? typed;
  }
  return typed;
}

/** The text with every line's bullet removed. */
export function stripBullets(text: string): string {
  return text
    .split('\n')
    .map((line) => (line.startsWith(BULLET) ? line.slice(BULLET.length) : line))
    .join('\n');
}

function breakLine(prev: string, start: number): ListEdit | undefined {
  // A break typed beside existing breaks reads the same wherever it lands, so
  // it is taken at the end of the line above, where the caret usually was.
  const at = slideLeft(prev, start, '\n');
  const lineStart = lineStartAt(prev, at);
  const line = prev.slice(lineStart, lineEndAt(prev, at));
  if (!line.startsWith(BULLET)) return undefined;
  const isOnBlankLineBelow = start - at > 1;
  if (isOnBlankLineBelow) return undefined;
  if (line === BULLET) return withoutBullet(prev, lineStart);
  const isOnBlankLineEndingList = at < start && !prev.startsWith(BULLET, start);
  if (isOnBlankLineEndingList) return undefined;
  // A break inside the marker splits after it, so the bullet stays with its text.
  const breakAt = Math.max(at, lineStart + BULLET.length);
  return {
    text: `${prev.slice(0, breakAt)}\n${BULLET}${prev.slice(breakAt)}`,
    selection: caretAt(breakAt + 1 + BULLET.length),
  };
}

function deleteChar(prev: string, start: number): ListEdit | undefined {
  const at = slideLeft(prev, start, prev[start]);
  if (prev[at] === '\n') {
    // Joining a bullet line onto the line above drops its bullet.
    const joinedStart = at + 1;
    if (!prev.startsWith(BULLET, joinedStart)) return undefined;
    return {
      text: prev.slice(0, at) + prev.slice(joinedStart + BULLET.length),
      selection: caretAt(at),
    };
  }
  const lineStart = lineStartAt(prev, at);
  const isInMarker = prev.startsWith(BULLET, lineStart) && at - lineStart < BULLET.length;
  return isInMarker ? withoutBullet(prev, lineStart) : undefined;
}

function recognizeBullet(next: string, caret: number): ListEdit | undefined {
  const lineStart = lineStartAt(next, caret);
  if (!TYPED_MARKERS.includes(next.slice(lineStart, caret))) return undefined;
  return {
    text: next.slice(0, lineStart) + BULLET + next.slice(caret),
    selection: caretAt(lineStart + BULLET.length),
  };
}

function withoutBullet(text: string, lineStart: number): ListEdit {
  return {
    text: text.slice(0, lineStart) + text.slice(lineStart + BULLET.length),
    selection: caretAt(lineStart),
  };
}

/** The one region that differs: `removed` from `prev` at `start` became `inserted`. */
function diffEdit(prev: string, next: string) {
  let start = 0;
  const shortest = Math.min(prev.length, next.length);
  while (start < shortest && prev[start] === next[start]) start += 1;
  let prevEnd = prev.length;
  let nextEnd = next.length;
  while (prevEnd > start && nextEnd > start && prev[prevEnd - 1] === next[nextEnd - 1]) {
    prevEnd -= 1;
    nextEnd -= 1;
  }
  return { start, removed: prev.slice(start, prevEnd), inserted: next.slice(start, nextEnd) };
}

/** The leftmost index from which a run of `char` reaches `index`. */
function slideLeft(text: string, index: number, char: string): number {
  let at = index;
  while (at > 0 && text[at - 1] === char) at -= 1;
  return at;
}

function lineStartAt(text: string, index: number): number {
  return index === 0 ? 0 : text.lastIndexOf('\n', index - 1) + 1;
}

function lineEndAt(text: string, index: number): number {
  const end = text.indexOf('\n', index);
  return end === -1 ? text.length : end;
}

function caretAt(index: number): TextSelection {
  return { start: index, end: index };
}
