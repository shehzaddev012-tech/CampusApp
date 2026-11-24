import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import { BrandLoader, PatternArt, Text } from '../components/ui';
import { PALETTE } from '../theme';

/** Shown while the app starts: the mark turning inside its ring, then the name. Matches the native launch screen. */
export function SplashScreen() {
  return (
    <PatternArt kind="rings" bg={PALETTE.ink} fg={PALETTE.green} style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.center}>
        <BrandLoader size={104} onDark />
        <Text variant="title2" color={PALETTE.paper} style={styles.word}>
          IAC Campus
        </Text>
        <Text variant="small" color={PALETTE.sage} style={styles.tag}>
          Institute for Art & Culture
        </Text>
      </View>
    </PatternArt>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  word: { marginTop: 22, fontSize: 30, lineHeight: 36, letterSpacing: -1 },
  tag: { marginTop: 6 },
});
