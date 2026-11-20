import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PALETTE, useTheme } from '../../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import type { IconType } from './types';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconType;
  /** Small colour dot (used for event categories). */
  dot?: string;
}

/** Filter pill. Selected = Deep Ink with Campus Green text. */
export function Chip({ label, selected, onPress, icon: Icon, dot }: Props) {
  const { colors, radius, isDark } = useTheme();
  const selBg = isDark ? colors.primary : PALETTE.ink;
  const selFg = isDark ? PALETTE.ink : colors.primary;
  const fg = selected ? selFg : colors.text;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[
        styles.base,
        {
          borderRadius: radius.pill,
          backgroundColor: selected ? selBg : colors.surface,
          borderColor: selected ? selBg : colors.border,
        },
      ]}>
      <View style={styles.row}>
        {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
        {Icon ? <Icon size={15} color={fg} strokeWidth={2.3} /> : null}
        <Text
          variant="smallStrong"
          color={fg}
          numberOfLines={1}
          style={Icon || dot ? styles.withLead : undefined}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 14, height: 36, borderWidth: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  withLead: { marginLeft: 7 },
});
