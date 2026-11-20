import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GraduationCap } from 'lucide-react-native';

import { PALETTE } from '../../theme';
import { Text } from './Text';

interface Props {
  size?: number;
  /** Show the "campushub" wordmark next to the mark. */
  withWordmark?: boolean;
  /** Use light text (for dark backgrounds). */
  onDark?: boolean;
}

/** CampusHub mark: a Campus Green tile with a Deep Ink cap, and a lowercase wordmark. */
export function Logo({ size = 44, withWordmark, onDark }: Props) {
  return (
    <View style={styles.row}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: PALETTE.green,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <GraduationCap size={size * 0.56} color={PALETTE.ink} strokeWidth={2.2} />
      </View>
      {withWordmark ? (
        <Text
          variant="title2"
          color={onDark ? PALETTE.paper : 'text'}
          style={[styles.word, { fontSize: size * 0.5, lineHeight: size * 0.62 }]}>
          campushub
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  word: { marginLeft: 10, letterSpacing: -0.8 },
});
