export interface Span {
  top: number;
  bottom: number;
}

export function revealOffset(
  box: Span,
  visibleHeight: number,
  offset: number,
  margin: number,
): number {
  const showingBottom = box.bottom + margin - visibleHeight;
  const showingTop = Math.max(0, box.top - margin);
  return Math.max(offset, Math.min(showingBottom, showingTop));
}
