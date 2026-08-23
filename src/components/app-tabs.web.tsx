import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  return (
    <Tabs style={styles.tabs}>
      <TabList asChild>
        <TopBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Today</TabButton>
          </TabTrigger>
          <TabTrigger name="journal" href="/journal" asChild>
            <TabButton>Journal</TabButton>
          </TabTrigger>
        </TopBar>
      </TabList>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButton}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function TopBar(props: TabListProps) {
  const theme = useTheme();

  return (
    <ThemedView style={[styles.barOuter, { borderBottomColor: theme.rule }]}>
      <View {...props} style={styles.barInner}>
        <ThemedText type="handSmall" style={styles.brand}>
          Daily Goals
        </ThemedText>
        {props.children}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  barOuter: {
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  barInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth + Spacing.six,
  },
  brand: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
