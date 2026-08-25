import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The active palette; anything that isn't explicitly dark reads as paper. */
export function useTheme() {
  return useColorScheme() === 'dark' ? Colors.dark : Colors.light;
}
