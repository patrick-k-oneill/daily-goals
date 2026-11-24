import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  lineLimit,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { TodaySnapshot } from '../types';

/**
 * The small Home Screen widget: today's date and its daily goals, read-only.
 * The function runs in the widget's own runtime, so everything it uses is
 * declared inside it or arrives in its props; a widget placed before the app
 * has published anything gets no props at all.
 */
const TodayGoals = (props: Partial<TodaySnapshot>, environment: WidgetEnvironment) => {
  'widget';
  const isDark = environment.colorScheme === 'dark';
  const unpublished = isDark
    ? { paper: '#171410', ink: '#EDE5D0', faded: '#9E9581', accent: '#E07B72' }
    : { paper: '#FAF5E4', ink: '#26221B', faded: '#7A7260', accent: '#D95D53' };
  const colors = props.colors?.[isDark ? 'dark' : 'light'] ?? unpublished;
  const lines = props.lines ?? [];
  const more = props.more ?? 0;
  const symbolOf = (done: number, total: number) => {
    if (done >= total) return 'checkmark.circle.fill';
    return done > 0 ? 'circle.lefthalf.filled' : 'circle';
  };

  return (
    <VStack
      alignment="leading"
      spacing={5}
      modifiers={[
        containerBackground(colors.paper, 'widget'),
        widgetURL(props.url ?? 'dailygoals://?from=widget'),
      ]}>
      <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(colors.accent)]}>
        {props.dateLabel ?? 'Daily Goals'}
      </Text>
      {lines.map((line) => (
        <HStack key={line.id} spacing={5}>
          <Image systemName={symbolOf(line.done, line.total)} size={12} color={colors.ink} />
          <Text modifiers={[font({ size: 13 }), foregroundStyle(colors.ink), lineLimit(1)]}>
            {line.title}
          </Text>
          <Spacer />
          {line.total > 1 ? (
            <Text modifiers={[font({ size: 11 }), foregroundStyle(colors.faded)]}>
              {line.done}/{line.total}
            </Text>
          ) : null}
        </HStack>
      ))}
      {more > 0 ? (
        <Text modifiers={[font({ size: 11 }), foregroundStyle(colors.faded)]}>+{more} more</Text>
      ) : null}
      {lines.length === 0 ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(colors.faded)]}>
          {props.dateLabel ? 'No daily goals on this page.' : 'Open Daily Goals to see today.'}
        </Text>
      ) : null}
      <Spacer />
    </VStack>
  );
};

export default createWidget('TodayGoals', TodayGoals);
