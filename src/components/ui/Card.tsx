import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

import { useTheme } from '../../theme';
import { PressableScale } from './PressableScale';

type Tone = 'surface' | 'sage' | 'inverse';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  tone?: Tone;
}

/**
 * Plain bordered surface. Separated from the background by a hairline border, not a shadow.
 * Do not nest a Card inside a Card.
 */
export function Card({ children, onPress, style, padding = 16, tone = 'surface' }: Props) {
  const { colors, radius } = useTheme();
  const backgrounds: Record<Tone, string> = {
    surface: colors.surface,
    sage: colors.surfaceAlt,
    inverse: colors.inverse,
  };
  const base: ViewStyle = {
    backgroundColor: backgrounds[tone],
    borderRadius: radius.xl,
    padding,
    borderWidth: tone === 'surface' ? 1 : 0,
    borderColor: colors.border,
  };

  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.99} style={[base, style]}>
        {children}
      </PressableScale>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
