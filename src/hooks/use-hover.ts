import { useState } from 'react';

/**
 * Pointer hover for one Pressable (iPadOS trackpad, Mac, web): spread
 * `hoverProps` onto it. Touch never hovers, so `hovered` stays false on a phone.
 */
export function useHover() {
  const [hovered, setHovered] = useState(false);
  const hoverProps = {
    onHoverIn: () => setHovered(true),
    onHoverOut: () => setHovered(false),
  };
  return { hovered, hoverProps };
}
