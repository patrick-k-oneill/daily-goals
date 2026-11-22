import { createContext, useContext, type RefObject } from 'react';
import type { View } from 'react-native';
import type Animated from 'react-native-reanimated';
import type { AnimatedRef, SharedValue } from 'react-native-reanimated';

export interface PageScroll {
  ref: AnimatedRef<Animated.ScrollView>;
  offset: SharedValue<number>;
  contentHeight: SharedValue<number>;
  insetBottom: number;
}

export const PageScrollContext = createContext<PageScroll | null>(null);

export function usePageScroll(): PageScroll | null {
  return useContext(PageScrollContext);
}

export const PageContentContext = createContext<RefObject<View | null> | null>(null);

export function usePageContent(): RefObject<View | null> | null {
  return useContext(PageContentContext);
}
