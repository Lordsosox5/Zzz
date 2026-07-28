import { useColorScheme } from 'react-native';
import { palette, type ThemeColors } from '@/constants/colors';

export function useColors(): ThemeColors & { isDark: boolean; radius: number; fonts: typeof palette.fonts } {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const theme = isDark ? palette.dark : palette.light;
  return { ...theme, isDark, radius: palette.radius, fonts: palette.fonts };
}
