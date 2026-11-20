import React from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';

import { Logo, PatternArt } from '../components/ui';
import { PALETTE } from '../theme';

export function SplashScreen() {
  return (
    <PatternArt kind="rings" bg={PALETTE.ink} fg={PALETTE.green} style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.center}>
        <Logo size={68} withWordmark onDark />
        <ActivityIndicator color={PALETTE.green} style={styles.spinner} />
      </View>
    </PatternArt>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  spinner: { marginTop: 36 },
});
