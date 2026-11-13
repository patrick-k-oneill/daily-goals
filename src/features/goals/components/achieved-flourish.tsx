import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

const STAR_BOX = 24;
const SPARK_WIDTH = 2;
const SPARK_LENGTH = 7;
/** Degrees clockwise from straight up: the sparks fan away from the title. */
const SPARK_ANGLES = [-35, 20, 75];

/**
 * The red-pen marks on an achieved section's title, drawn in a box the size of
 * the title: an underline, and a star at its top-right corner. `moment` runs
 * 0 → 1 as the reward moment plays — the underline is struck, the star stamped,
 * sparks fly off it — and at 1 the marks sit as drawn.
 */
export function AchievedFlourish({ moment }: { moment: SharedValue<number> }) {
  const theme = useTheme();

  const underline = useAnimatedStyle(() => {
    const drawn = interpolate(moment.get(), [0, 0.45], [0, 1], Extrapolation.CLAMP);
    return { transform: [{ rotate: '-1deg' }, { scaleX: 1 - (1 - drawn) ** 2 }] };
  });
  const star = useAnimatedStyle(() => {
    const played = moment.get();
    const turn = interpolate(played, [0.4, 0.68], [-45, 10], Extrapolation.CLAMP);
    return {
      opacity: interpolate(played, [0.4, 0.5], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(
            played,
            [0.4, 0.68, 0.84, 1],
            [2.6, 0.88, 1.08, 1],
            Extrapolation.CLAMP,
          ),
        },
        { rotate: `${turn}deg` },
      ],
    };
  });

  return (
    <View style={styles.marks} aria-hidden>
      <Animated.View style={[styles.underline, { backgroundColor: theme.accent }, underline]} />
      <View style={styles.corner}>
        {SPARK_ANGLES.map((angle) => (
          <Spark key={angle} moment={moment} angle={angle} />
        ))}
        <Animated.Text style={[styles.star, { color: theme.accent }, star]}>★</Animated.Text>
      </View>
    </View>
  );
}

function Spark({ moment, angle }: { moment: SharedValue<number>; angle: number }) {
  const theme = useTheme();

  const flight = useAnimatedStyle(() => {
    const played = moment.get();
    return {
      opacity: interpolate(played, [0.62, 0.72, 1], [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        { rotate: `${angle}deg` },
        { translateY: interpolate(played, [0.62, 1], [-12, -24], Extrapolation.CLAMP) },
      ],
    };
  });

  return <Animated.View style={[styles.spark, { backgroundColor: theme.accent }, flight]} />;
}

const styles = StyleSheet.create({
  marks: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
  underline: {
    position: 'absolute',
    left: -4,
    right: 0,
    bottom: -1,
    height: 3,
    borderRadius: 2,
    transformOrigin: 'left center',
  },
  corner: {
    position: 'absolute',
    top: -8,
    right: -18,
    width: STAR_BOX,
    height: STAR_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    fontSize: 20,
    lineHeight: STAR_BOX,
  },
  spark: {
    position: 'absolute',
    left: (STAR_BOX - SPARK_WIDTH) / 2,
    top: (STAR_BOX - SPARK_LENGTH) / 2,
    width: SPARK_WIDTH,
    height: SPARK_LENGTH,
    borderRadius: SPARK_WIDTH / 2,
  },
});
