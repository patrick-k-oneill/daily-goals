/**
 * The marker a list line starts with, by tier: a filled bullet, then one
 * indented hollow tier. Stored as-is so the text reads right wherever it is shown.
 */
export const MARKERS = ['● ', '  ○ '] as const;

type Marker = (typeof MARKERS)[number];

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

/**
 * Return pressed with the caret, or a selected range, at `selection`: a bullet
 * line continues the list at its tier, an empty indented bullet outdents, an
 * empty top-level bullet ends the list, and a prose line takes a plain break.
 */
export function breakLine(text: string, { start, end }: TextSelection): ListEdit {
  const lineStart = lineStartAt(text, start);
  const marker = markerAt(text, lineStart);
  if (marker === undefined) return splice(text, start, end, '\n');
  const isEmptyBullet = start === end && text.slice(lineStart, lineEndAt(text, start)) === marker;
  if (isEmptyBullet) return replaceMarker(text, lineStart, marker, outdented(marker));
  // A break inside the marker splits after it, so the bullet stays with its text.
  const breakAt = Math.max(start, lineStart + marker.length);
  return splice(text, breakAt, Math.max(end, breakAt), `\n${marker}`);
}

/** Tab pressed on a top-level bullet indents it one tier; no deeper tier exists. */
export function indentLine(text: string, caret: number): ListEdit | undefined {
  const lineStart = lineStartAt(text, caret);
  if (markerAt(text, lineStart) !== MARKERS[0]) return undefined;
  const edit = replaceMarker(text, lineStart, MARKERS[0], MARKERS[1]);
  const shifted = caret + MARKERS[1].length - MARKERS[0].length;
  return { text: edit.text, selection: caretAt(Math.max(shifted, edit.selection.start)) };
}

/**
 * The list rules applied to one keyboard edit the platform already made,
 * found by diffing the previous text against what the input now holds: a
 * typed break or tab follows breakLine and indentLine, deleting into a marker
 * outdents the bullet, and "- " or "* " typed at a line start becomes a bullet.
 * Prose lines, pastes and replacements pass through unchanged.
 */
export function applyListEdit(prev: string, next: string): ListEdit {
  const { start, removed, inserted } = diffEdit(prev, next);
  const typed = { text: next, selection: caretAt(start + inserted.length) };
  if (removed === '' && inserted === '\n') return typedBreak(prev, start) ?? typed;
  if (removed === '' && inserted === '\t') return typedTab(prev, start) ?? typed;
  if (removed.length === 1 && inserted === '') return deleteChar(prev, start) ?? typed;
  if (inserted !== '' && !inserted.includes('\n')) {
    return recognizeBullet(next, start + inserted.length) ?? typed;
  }
  return typed;
}

/** The text with every line's marker removed. */
export function stripBullets(text: string): string {
  return text
    .split('\n')
    .map((line) => line.slice(markerAt(line, 0)?.length ?? 0))
    .join('\n');
}

function typedBreak(prev: string, start: number): ListEdit | undefined {
  // A break typed beside existing breaks reads the same wherever it lands, so
  // it is taken at the end of the line above, where the caret usually was.
  const at = slideLeft(prev, start, '\n');
  const lineStart = lineStartAt(prev, at);
  const marker = markerAt(prev, lineStart);
  if (marker === undefined) return undefined;
  const isOnBlankLineBelow = start - at > 1;
  if (isOnBlankLineBelow) return undefined;
  const line = prev.slice(lineStart, lineEndAt(prev, at));
  const isOnBlankLineEndingList =
    line !== marker && at < start && markerAt(prev, start) === undefined;
  if (isOnBlankLineEndingList) return undefined;
  return breakLine(prev, caretAt(at));
}

function typedTab(prev: string, start: number): ListEdit | undefined {
  if (markerAt(prev, lineStartAt(prev, start)) === undefined) return undefined;
  // An already indented bullet swallows the tab.
  return indentLine(prev, start) ?? { text: prev, selection: caretAt(start) };
}

function deleteChar(prev: string, start: number): ListEdit | undefined {
  const at = slideLeft(prev, start, prev[start]);
  if (prev[at] === '\n') {
    // Joining a bullet line onto the line above drops its marker.
    const joinedStart = at + 1;
    const marker = markerAt(prev, joinedStart);
    if (marker === undefined) return undefined;
    return splice(prev, at, joinedStart + marker.length, '');
  }
  const lineStart = lineStartAt(prev, at);
  const marker = markerAt(prev, lineStart);
  const isInMarker = marker !== undefined && at - lineStart < marker.length;
  return isInMarker ? replaceMarker(prev, lineStart, marker, outdented(marker)) : undefined;
}

function recognizeBullet(next: string, caret: number): ListEdit | undefined {
  const lineStart = lineStartAt(next, caret);
  if (!TYPED_MARKERS.includes(next.slice(lineStart, caret))) return undefined;
  return replaceMarker(next, lineStart, next.slice(lineStart, caret), MARKERS[0]);
}

function markerAt(text: string, lineStart: number): Marker | undefined {
  return MARKERS.find((marker) => text.startsWith(marker, lineStart));
}

/** The marker one tier up, or none from the top tier. */
function outdented(marker: Marker): string {
  const tier = MARKERS.indexOf(marker);
  return tier > 0 ? MARKERS[tier - 1] : '';
}

function replaceMarker(text: string, lineStart: number, from: string, to: string): ListEdit {
  return splice(text, lineStart, lineStart + from.length, to);
}

/** `text` with `start`..`end` replaced by `insert`, the caret after the insert. */
function splice(text: string, start: number, end: number, insert: string): ListEdit {
  return {
    text: text.slice(0, start) + insert + text.slice(end),
    selection: caretAt(start + insert.length),
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
