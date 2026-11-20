import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { PressableScale } from './PressableScale';
import type { IconType } from './types';

interface Props {
  icon: IconType;
  onPress?: () => void;
  size?: number;
  /** Show a small unread dot. */
  dot?: boolean;
  variant?: 'outline' | 'plain';
  accessibilityLabel: string;
}

export function IconButton({
  icon: Icon,
  onPress,
  size = 42,
  dot,
  variant = 'outline',
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: variant === 'outline' ? colors.surface : 'transparent',
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: colors.border,
        },
      ]}>
      <Icon size={size * 0.46} color={colors.text} strokeWidth={2.1} />
      {dot ? (
        <View style={[styles.dot, { backgroundColor: colors.coral, borderColor: colors.surface }]} />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
