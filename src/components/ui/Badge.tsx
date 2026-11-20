import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PALETTE, useTheme } from '../../theme';
import { Text } from './Text';
import type { IconType } from './types';

export type BadgeTone =
  | 'primary'
  | 'ink'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'sky'
  | 'coral'
  | 'lavender'
  | 'yellow';

interface Props {
  label: string;
  tone?: BadgeTone;
  icon?: IconType;
}

export function Badge({ label, tone = 'primary', icon: Icon }: Props) {
  const { colors, radius } = useTheme();
  const map: Record<BadgeTone, [string, string]> = {
    primary: [colors.primary, colors.onPrimary],
    ink: [PALETTE.ink, PALETTE.paper],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    info: [colors.infoSoft, colors.info],
    neutral: [colors.surfaceAlt, colors.textSecondary],
    sky: [colors.sky, PALETTE.ink],
    coral: [colors.coral, PALETTE.ink],
    lavender: [colors.lavender, PALETTE.ink],
    yellow: [colors.yellow, PALETTE.ink],
  };
  const [bg, fg] = map[tone];

  return (
    <View style={[styles.base, { backgroundColor: bg, borderRadius: radius.pill }]}>
      {Icon ? <Icon size={12} color={fg} strokeWidth={2.6} /> : null}
      <Text variant="caption" color={fg} style={[styles.label, Icon ? styles.withIcon : null]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: { fontSize: 11.5, lineHeight: 15 },
  withIcon: { marginLeft: 4 },
});
