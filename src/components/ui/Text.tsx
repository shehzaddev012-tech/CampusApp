import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';

import { Colors, TypographyVariant, useTheme } from '../../theme';

export type TextColor = keyof Colors | (string & {});

interface Props extends TextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: TextStyle['textAlign'];
}

/** Themed text. Always use this instead of the raw RN `Text`. */
export function Text({
  variant = 'body',
  color = 'text',
  align,
  style,
  ...rest
}: Props) {
  const { colors, typography } = useTheme();
  const resolved =
    (colors as unknown as Record<string, string>)[color] ?? color;
  return (
    <RNText
      {...rest}
      style={[typography[variant], { color: resolved }, align ? { textAlign: align } : null, style]}
    />
  );
}
