import { useEffect, useEffectEvent, type RefObject } from 'react';
import { Keyboard, Platform, type KeyboardMetrics, type View } from 'react-native';

import { revealOffset } from '@/components/ui/keyboard-reveal';
import { usePageContent, usePageScroll, type PageScroll } from '@/components/ui/page-scroll';
import { Spacing } from '@/constants/theme';

import { isKeyboardDocked } from './use-keyboard-dock';

const SHOWN = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

export function useKeyboardReveal(target: RefObject<View | null>): () => void {
  const scroll = usePageScroll();
  const content = usePageContent();

  const onKeyboardShown = useEffectEvent((keyboard: KeyboardMetrics) =>
    revealAboveKeyboard(scroll, content?.current, target.current, keyboard),
  );

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const subscription = Keyboard.addListener(SHOWN, (event) =>
      onKeyboardShown(event.endCoordinates),
    );
    return () => subscription.remove();
  }, []);

  return () => {
    const keyboard = Platform.OS === 'web' ? undefined : Keyboard.metrics();
    if (keyboard) revealAboveKeyboard(scroll, content?.current, target.current, keyboard);
  };
}

function revealAboveKeyboard(
  scroll: PageScroll | null,
  page: View | null | undefined,
  box: View | null,
  keyboard: KeyboardMetrics,
) {
  const scroller = scroll?.ref.current;
  const viewport = scroller?.getNativeScrollRef();
  if (!scroll || !scroller || !viewport || !page || !box || !isKeyboardDocked(keyboard)) return;
  viewport.measureInWindow((_x, viewportTop, _width, viewportHeight) => {
    box.measureLayout(page, (_left, top, _boxWidth, height) => {
      const visibleHeight = Math.min(keyboard.screenY - viewportTop, viewportHeight);
      const offset = scroll.offset.get();
      const to = revealOffset({ top, bottom: top + height }, visibleHeight, offset, Spacing.three);
      if (to > offset) scroller.scrollTo({ y: to, animated: true });
    });
  });
}
