import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const SEAL = require('../../assets/iac-seal-white.png');

/** The app's logo: the Institute for Art & Culture seal in white on the deep IAC green (same as the launcher icon). */
export function UniversityLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel="Institute for Art and Culture" accessibilityRole="image">
      <Image source={SEAL} style={{ width: size * 0.9, height: size * 0.9 }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: '#14231D', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
