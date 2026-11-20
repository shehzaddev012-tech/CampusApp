import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfirmHost } from './src/components/ConfirmHost';
import { ToastHost } from './src/components/ToastHost';
import { navigationRef } from './src/navigation/ref';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useSession } from './src/store/sessionStore';
import { ThemeProvider, useTheme } from './src/theme';

function Shell() {
  const { colors, isDark } = useTheme();
  const bootstrap = useSession(s => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <RootNavigator />
      <ToastHost />
      <ConfirmHost />
    </NavigationContainer>
  );
}

/** The accent colour follows the university the signed-in student belongs to. */
function ThemedApp() {
  const accent = useSession(s => s.university?.accent ?? null);
  return (
    <ThemeProvider accent={accent}>
      <Shell />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemedApp />
    </SafeAreaProvider>
  );
}
