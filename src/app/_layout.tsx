import { Caveat_700Bold, useFonts } from '@expo-google-fonts/caveat';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useGoalsStore, useMaterializeToday } from '@/features/goals/store';
import { useGratitudeStore } from '@/features/gratitude/store';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { useHydrated } from '@/lib/persisted-store';

SplashScreen.preventAutoHideAsync();

const persistedStores = [useGoalsStore, useGratitudeStore];

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const palette = useTheme();
  const [fontsLoaded, fontError] = useFonts({ Caveat_700Bold });
  const storesHydrated = useHydrated(persistedStores);
  useMaterializeToday();
  const ready = (fontsLoaded || Boolean(fontError)) && storesHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Nothing paints until the handwriting font registers (native Fabric won't
  // re-resolve a font family on re-render) and every store has rehydrated, so
  // no page renders empty and then pops.
  if (!ready) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.background,
      text: palette.text,
      border: palette.border,
    },
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navTheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
