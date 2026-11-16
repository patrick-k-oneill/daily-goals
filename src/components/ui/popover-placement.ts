export interface AnchorBox {
  x: number;
  y: number;
  height: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface PopoverPlacement {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

const WINDOW_MARGIN = 8;
const ANCHOR_GAP = 4;

export function placePopover(
  anchor: AnchorBox,
  preferredWidth: number,
  window: WindowSize,
): PopoverPlacement {
  const width = Math.min(preferredWidth, window.width - 2 * WINDOW_MARGIN);
  const rightmost = window.width - WINDOW_MARGIN - width;
  const top = anchor.y + anchor.height + ANCHOR_GAP;
  return {
    left: Math.max(WINDOW_MARGIN, Math.min(anchor.x, rightmost)),
    top,
    width,
    maxHeight: Math.max(0, window.height - WINDOW_MARGIN - top),
  };
}
