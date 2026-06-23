/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeContext } from '@/context/ThemeContext';

export function useTheme() {
  let activeTheme: 'light' | 'dark' = 'light';
  
  try {
    const context = useThemeContext();
    activeTheme = context.activeTheme;
  } catch (error) {
    // Fallback if used outside provider
    const scheme = useColorScheme();
    activeTheme = scheme === 'unspecified' ? 'light' : scheme;
  }

  return Colors[activeTheme];
}
