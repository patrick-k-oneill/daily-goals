import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { scaleLengths, scaleTextStyle } from '@/features/text-size/logic';
import { useTextScale } from '@/features/text-size/store';
import { useTheme } from '@/hooks/use-theme';

import { STAR_BOX, STAR_CORNER } from './achieved-flourish-layout';

// Every length here is the mark at 100%; the marks grow with the title they are drawn on.
const UNDERLINE = { left: -4, bottom: -1, height: 3, borderRadius: 2 };
const SPARK = { width: 2, length: 7, launch: -12, landing: -24 };
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
  const scale = useTextScale();

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
      <Animated.View
        style={[
          styles.underline,
          scaleLengths(UNDERLINE, scale),
          { backgroundColor: theme.accent },
          underline,
        ]}
      />
      <View style={[styles.corner, scaleLengths(STAR_CORNER, scale)]}>
        {SPARK_ANGLES.map((angle) => (
          <Spark key={angle} moment={moment} angle={angle} />
        ))}
        <Animated.Text style={[scaleTextStyle(styles.star, scale), { color: theme.accent }, star]}>
          ★
        </Animated.Text>
      </View>
    </View>
  );
}

function Spark({ moment, angle }: { moment: SharedValue<number>; angle: number }) {
  const theme = useTheme();
  const scale = useTextScale();
  const { width, length, launch, landing } = scaleLengths(SPARK, scale);
  const box = STAR_BOX * scale;

  const flight = useAnimatedStyle(() => {
    const played = moment.get();
    return {
      opacity: interpolate(played, [0.62, 0.72, 1], [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        { rotate: `${angle}deg` },
        { translateY: interpolate(played, [0.62, 1], [launch, landing], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.spark,
        {
          left: (box - width) / 2,
          top: (box - length) / 2,
          width,
          height: length,
          borderRadius: width / 2,
          backgroundColor: theme.accent,
        },
        flight,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  marks: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
  underline: {
    position: 'absolute',
    right: 0,
    transformOrigin: 'left center',
  },
  corner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    fontSize: 20,
    lineHeight: STAR_BOX,
  },
  spark: {
    position: 'absolute',
  },
});
