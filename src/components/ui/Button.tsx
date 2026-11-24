import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useTheme } from '../../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import type { IconType } from './types';

/**
 * primary   Campus Green, the main action
 * secondary Deep Ink, strong alternative
 * soft      quiet sage fill
 * ghost     outline only
 * danger    destructive
 */
type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: IconType;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  loading,
  disabled,
  fullWidth = true,
  style,
}: Props) {
  const { colors, radius, isDark } = useTheme();

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: 'transparent' },
    secondary: {
      bg: colors.inverse,
      fg: colors.onInverse,
      border: isDark ? colors.border : 'transparent',
    },
    soft: { bg: colors.surfaceAlt, fg: colors.text, border: 'transparent' },
    ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: 'transparent' },
  }[variant];

  const isDisabled = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled }}
      style={[
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          borderRadius: radius.lg - 2,
          height: size === 'lg' ? 52 : 44,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}>
      <View style={styles.row}>
        {/* While loading, the label stays and a small spinner takes the icon's place, so nothing jumps. */}
        {loading ? <ActivityIndicator size="small" color={palette.fg} /> : Icon ? <Icon size={19} color={palette.fg} strokeWidth={2.4} /> : null}
        <Text
          variant="button"
          color={palette.fg}
          numberOfLines={1}
          style={loading || Icon ? styles.withIcon : undefined}>
          {title}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { paddingHorizontal: 20, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  withIcon: { marginLeft: 8 },
});
