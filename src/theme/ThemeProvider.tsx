import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mix, readableOn } from './color';
import {
  Colors,
  ElevationLevel,
  darkColors,
  elevation,
  lightColors,
  radius,
  spacing,
  typography,
} from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemePrefs {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

/** Persisted user preference (System / Light / Dark). */
export const useThemePrefs = create<ThemePrefs>()(
  persist(
    set => ({
      mode: 'system',
      setMode: mode => set({ mode }),
    }),
    {
      name: 'campushub.theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export interface Theme {
  colors: Colors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadow: (level: ElevationLevel) => ReturnType<typeof elevation>;
}

const ThemeContext = createContext<Theme | null>(null);

interface Props {
  /** University accent colour. Falls back to the CampusHub brand colour. */
  accent?: string | null;
  children: React.ReactNode;
}

export function ThemeProvider({ accent, children }: Props) {
  const system = useColorScheme();
  const mode = useThemePrefs(s => s.mode);
  const setMode = useThemePrefs(s => s.setMode);

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';

  const theme = useMemo<Theme>(() => {
    const base = isDark ? darkColors : lightColors;
    let colors = base;
    if (accent) {
      // The brand (Campus Green) stays constant; each university only gets its own
      // identity colour for its logo tile and small accents.
      const university = isDark ? mix(accent, '#FFFFFF', 0.2) : accent;
      colors = { ...base, university, onUniversity: readableOn(university) };
    }
    return {
      colors,
      isDark,
      mode,
      setMode,
      spacing,
      radius,
      typography,
      shadow: level => elevation(level, colors.shadow, isDark),
    };
  }, [accent, isDark, mode, setMode]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
