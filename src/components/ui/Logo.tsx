import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PALETTE } from '../../theme';
import { Text } from './Text';
import { UniversityLogo } from './UniversityLogo';

interface Props {
  size?: number;
  /** Show the "IAC Campus" wordmark next to the seal. */
  withWordmark?: boolean;
  /** Use light text (for dark backgrounds). */
  onDark?: boolean;
}

/**
 * The mark of the app is the seal of the Institute for Art & Culture. The launcher icons
 * (`android/app/src/main/res`) are made from the same seal.
 */
export function LogoMark({ size = 44 }: { size?: number }) {
  return <UniversityLogo size={size} />;
}

export function Logo({ size = 44, withWordmark, onDark }: Props) {
  return (
    <View style={styles.row}>
      <LogoMark size={size} />
      {withWordmark ? (
        <Text
          variant="title2"
          color={onDark ? PALETTE.paper : 'text'}
          style={[styles.word, { fontSize: size * 0.5, lineHeight: size * 0.62 }]}>
          IAC Campus
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { marginLeft: 10, letterSpacing: -0.8 },
});
