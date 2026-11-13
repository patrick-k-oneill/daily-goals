import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dropTap, liftTap } from '@/lib/haptics';

import { dragSlots, roomBeside, slotAt, type RowBox } from './reorder-geometry';

/** How long a press rests on a handle before its row lifts. */
const LONG_PRESS_MS = 350;
const LIFT_MS = 120;
/** The other rows slide to make room in this long; the dropped row takes longer, so it lands last. */
const SLIDE_MS = 160;
const SETTLE_MS = 220;
const LIFT_SCALE = 0.02;
/** A pointer that travels further than this between press and release dragged; it did not tap. */
const TAP_SLOP = 10;

const SLIDE = LinearTransition.duration(SLIDE_MS);
const MOVE_UP = 'moveUp';
const MOVE_DOWN = 'moveDown';

/** A lifted row: where it came from and the slot it hovers over. */
interface Drag {
  token: string;
  id: string;
  from: number;
  over: number;
  height: number;
  tops: number[];
}

/** What the gesture reads on the UI thread to keep a lifted row inside its list. */
interface DragBounds {
  origin: number;
  min: number;
  max: number;
  thresholds: number[];
}

export interface Reorderable {
  ids: string[];
  gap: number;
  drag: Drag | null;
  /** The React key for a row; it changes when the row is dropped in a new place. */
  keyOf: (id: string) => string;
  measure: (id: string, box: RowBox) => void;
  begin: (id: string) => void;
  hover: (over: number) => void;
  drop: (success: boolean) => void;
  moveBy: (id: string, delta: number) => void;
  pressIn: (event: GestureResponderEvent) => void;
  /** Whether the press that just ended on a handle was a tap, not a lift or a drag. */
  isTap: (event: GestureResponderEvent) => boolean;
  /** The token of the row a gesture last lifted. */
  active: SharedValue<string | null>;
  /** True from a lift until its drop has settled; no other row lifts meanwhile. */
  busy: SharedValue<boolean>;
  translateY: SharedValue<number>;
  lift: SharedValue<number>;
  bounds: SharedValue<DragBounds | null>;
  slot: SharedValue<number>;
}

/**
 * A list whose rows are reordered by long-pressing a handle and dragging.
 * Render each row in a `ReorderableRow` keyed by `keyOf`, directly inside a
 * column whose `gap` is passed here, and put `useReorderHandle` on the part
 * of the row that lifts it. `onMove` receives the row and its new index.
 *
 * The lifted row leaves the flow and follows the finger; the others keep
 * their order and open its slot with a margin, so nothing reorders until the
 * drop has settled.
 */
export function useReorderable({
  ids,
  gap,
  onMove,
}: {
  ids: string[];
  gap: number;
  onMove: (id: string, toIndex: number) => void;
}): Reorderable {
  const boxes = useRef(new Map<string, RowBox>());
  const live = useRef<Drag | null>(null);
  const liftedPress = useRef(false);
  const pressOrigin = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [generations, setGenerations] = useState<Record<string, number>>({});
  const active = useSharedValue<string | null>(null);
  const busy = useSharedValue(false);
  const translateY = useSharedValue(0);
  const lift = useSharedValue(0);
  const bounds = useSharedValue<DragBounds | null>(null);
  const slot = useSharedValue(0);

  const keyOf = (id: string) => `${id}:${generations[id] ?? 0}`;

  const begin = (id: string) => {
    const from = ids.indexOf(id);
    const rows = ids.flatMap((rowId) => boxes.current.get(rowId) ?? []);
    if (from < 0 || rows.length !== ids.length) {
      active.set(null);
      busy.set(false);
      return;
    }
    const { tops, thresholds } = dragSlots(rows, from, gap);
    const lifted = { token: keyOf(id), id, from, over: from, height: rows[from].height, tops };
    live.current = lifted;
    liftedPress.current = true;
    setDrag(lifted);
    slot.set(from);
    bounds.set({ origin: tops[from], min: tops[0], max: tops[tops.length - 1], thresholds });
    liftTap();
  };

  const hover = (over: number) => {
    if (!live.current) return;
    live.current = { ...live.current, over };
    setDrag(live.current);
  };

  const finish = () => {
    const dropped = live.current;
    live.current = null;
    setDrag(null);
    busy.set(false);
    if (!dropped || dropped.over === dropped.from) return;
    // The dropped row remounts in its new place, so its drag offset goes with the old view
    // in the same commit that reorders the list.
    setGenerations((known) => ({ ...known, [dropped.id]: (known[dropped.id] ?? 0) + 1 }));
    onMove(dropped.id, dropped.over);
  };

  const drop = (success: boolean) => {
    const lifted = live.current;
    if (!lifted) return;
    const over = success ? lifted.over : lifted.from;
    live.current = { ...lifted, over };
    setDrag(live.current);
    dropTap();
    lift.set(withTiming(0, { duration: SETTLE_MS }));
    translateY.set(
      withTiming(lifted.tops[over] - lifted.tops[lifted.from], { duration: SETTLE_MS }, () => {
        'worklet';
        scheduleOnRN(finish);
      }),
    );
  };

  const moveBy = (id: string, delta: number) => {
    const to = ids.indexOf(id) + delta;
    if (live.current || to < 0 || to >= ids.length) return;
    onMove(id, to);
    AccessibilityInfo.announceForAccessibility(`Moved to ${to + 1} of ${ids.length}`);
  };

  return {
    ids,
    gap,
    drag,
    keyOf,
    measure: (id, box) => boxes.current.set(id, box),
    begin,
    hover,
    drop,
    moveBy,
    pressIn: ({ nativeEvent }) => {
      liftedPress.current = false;
      pressOrigin.current = { x: nativeEvent.pageX, y: nativeEvent.pageY };
    },
    isTap: ({ nativeEvent }) => {
      if (liftedPress.current) return false;
      // The web gesture captures the pointer, so a press dragged off the handle still ends on it.
      if (Platform.OS !== 'web') return true;
      const dx = nativeEvent.pageX - pressOrigin.current.x;
      const dy = nativeEvent.pageY - pressOrigin.current.y;
      // A key press carries no position; the comparison is false and it stays a tap.
      return !(dx * dx + dy * dy > TAP_SLOP * TAP_SLOP);
    },
    active,
    busy,
    translateY,
    lift,
    bounds,
    slot,
  };
}

interface Row {
  reorder: Reorderable;
  id: string;
  token: string;
  index: number;
}

const RowContext = createContext<Row | null>(null);

/** One row of a reorderable list; a direct child of the list's column. */
export function ReorderableRow({
  id,
  reorder,
  children,
}: {
  id: string;
  reorder: Reorderable;
  children: ReactNode;
}) {
  // Every row re-renders on each change of the drag: on web the slide is measured per render.
  'use no memo';
  const theme = useTheme();
  const { drag, active, translateY, lift } = reorder;
  const token = reorder.keyOf(id);
  const index = reorder.ids.indexOf(id);
  const lifted = drag?.token === token;

  const liftStyle = useAnimatedStyle(() => {
    const mine = active.get() === token;
    return {
      transform: [
        { translateY: mine ? translateY.get() : 0 },
        { scale: mine ? 1 + LIFT_SCALE * lift.get() : 1 },
      ],
    };
  });
  const paperStyle = useAnimatedStyle(() => ({
    opacity: active.get() === token ? lift.get() : 0,
  }));

  let placement: ViewStyle | undefined;
  if (lifted) {
    placement = { ...styles.lifted, top: drag.tops[drag.from] };
  } else if (drag) {
    const side = roomBeside(index, drag.from, drag.over, reorder.ids.length);
    const room = drag.height + reorder.gap;
    placement = {
      marginTop: side === 'above' ? room : 0,
      marginBottom: side === 'below' ? room : 0,
    };
  }

  return (
    <RowContext value={{ reorder, id, token, index }}>
      <Animated.View
        layout={drag ? SLIDE : undefined}
        onLayout={(e) => reorder.measure(id, e.nativeEvent.layout)}
        style={placement}>
        <Animated.View style={liftStyle}>
          {lifted && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.paper,
                {
                  backgroundColor: theme.background,
                  boxShadow: `0px 6px 16px ${theme.shadow}`,
                },
                paperStyle,
              ]}
            />
          )}
          {children}
        </Animated.View>
      </Animated.View>
    </RowContext>
  );
}

/** The part of a key-down event the handle reads; the same on web and native. */
interface KeyDown {
  nativeEvent: { altKey: boolean; key: string };
  preventDefault: () => void;
}

export interface ReorderHandle {
  /** For the `GestureDetector` around the handle. */
  gesture: PanGesture;
  /** Spread onto the handle's Pressable. */
  pressableProps: {
    onPressIn: (event: GestureResponderEvent) => void;
    accessibilityActions: { name: string; label: string }[];
    onAccessibilityAction: (event: AccessibilityActionEvent) => void;
    onKeyDown: (event: KeyDown) => void;
  };
  /** Wraps the handle's `onPress` so the release that ends a lift is not also a tap. */
  unlessLifted: (onPress: () => void) => (event: GestureResponderEvent) => void;
}

/**
 * Makes a Pressable the handle of the row it sits in: a long press lifts the
 * row and the drag that follows moves it; "Move up" and "Move down"
 * accessibility actions, and Alt+↑/↓ from a keyboard, move it one place.
 * Outside a `ReorderableRow` the handle is inert.
 */
export function useReorderHandle(): ReorderHandle {
  const row = useContext(RowContext);
  const owns = useSharedValue(false);

  const count = row?.reorder.ids.length ?? 0;
  const index = row?.index ?? 0;
  const moveBy = (delta: number) => row?.reorder.moveBy(row.id, delta);

  const accessibilityActions = [
    ...(index > 0 ? [{ name: MOVE_UP, label: 'Move up' }] : []),
    ...(index < count - 1 ? [{ name: MOVE_DOWN, label: 'Move down' }] : []),
  ];

  return {
    gesture: row ? liftAndDrag(row, owns) : Gesture.Pan().enabled(false),
    pressableProps: {
      onPressIn: (event) => row?.reorder.pressIn(event),
      accessibilityActions,
      onAccessibilityAction: (event) => {
        if (event.nativeEvent.actionName === MOVE_UP) moveBy(-1);
        if (event.nativeEvent.actionName === MOVE_DOWN) moveBy(1);
      },
      onKeyDown: (event) => {
        const { altKey, key } = event.nativeEvent;
        if (!altKey || (key !== 'ArrowUp' && key !== 'ArrowDown')) return;
        event.preventDefault();
        moveBy(key === 'ArrowUp' ? -1 : 1);
      },
    },
    unlessLifted: (onPress) => (event) => {
      if (!row || row.reorder.isTap(event)) onPress();
    },
  };
}

function liftAndDrag({ reorder, id, token }: Row, owns: SharedValue<boolean>): PanGesture {
  const { active, busy, translateY, lift, bounds, slot, begin, hover, drop } = reorder;

  return Gesture.Pan()
    .enabled(reorder.ids.length > 1)
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      'worklet';
      if (busy.get()) return;
      busy.set(true);
      owns.set(true);
      bounds.set(null);
      translateY.set(0);
      active.set(token);
      lift.set(withTiming(1, { duration: LIFT_MS }));
      scheduleOnRN(begin, id);
    })
    .onUpdate((event) => {
      'worklet';
      if (!owns.get()) return;
      const range = bounds.get();
      if (!range) {
        translateY.set(event.translationY);
        return;
      }
      const top = Math.min(range.max, Math.max(range.min, range.origin + event.translationY));
      translateY.set(top - range.origin);
      const over = slotAt(range.thresholds, top);
      if (over === slot.get()) return;
      slot.set(over);
      scheduleOnRN(hover, over);
    })
    .onFinalize((_event, success) => {
      'worklet';
      if (!owns.get()) return;
      owns.set(false);
      scheduleOnRN(drop, success);
    });
}

const styles = StyleSheet.create({
  lifted: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
  },
  // The paper a lifted row carries with it: the page color and a shadow, overhanging the row
  // by 4pt either side like the handle's hover tint.
  paper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -Spacing.one,
    right: -Spacing.one,
    borderRadius: Spacing.one,
  },
});
