import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

interface KeyboardDock {
  /** False while an iPad keyboard floats or is split over the page. */
  isDocked: boolean;
  /** The bottom inset the page takes on top of the one iOS gives a docked keyboard. */
  inset: number;
}

const AT_REST: KeyboardDock = { isDocked: true, inset: 0 };

// iOS only replaces an inset it took for a floating keyboard when the page's
// own inset changes, so the undocked one differs from the inset at rest.
const UNDOCKED: KeyboardDock = { isDocked: false, inset: 1 };

/**
 * Whether the iOS keyboard sits docked at the foot of the window. A keyboard
 * that docks while it is showing reports its frame before the page can ask iOS
 * to inset for it, so the page carries that inset itself until it hides.
 */
export function useKeyboardDock(): KeyboardDock {
  const [dock, setDock] = useState(AT_REST);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const subscription = Keyboard.addListener('keyboardWillChangeFrame', (event) =>
      setDock((prev) => nextDock(prev, event)),
    );
    return () => subscription.remove();
  }, []);

  return dock;
}

function nextDock(prev: KeyboardDock, { endCoordinates }: KeyboardEvent): KeyboardDock {
  // Read when the frame changes: a rendered window size can lag a rotation.
  // react-doctor-disable-next-line react-doctor/rn-no-dimensions-get
  const window = Dimensions.get('window');
  const { screenY, width, height } = endCoordinates;
  if (screenY >= window.height) return AT_REST;
  const isDocked = width >= window.width && screenY + height >= window.height;
  if (!isDocked) return UNDOCKED;
  return prev.isDocked ? prev : { isDocked: true, inset: window.height - screenY };
}
