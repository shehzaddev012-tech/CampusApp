import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { useTheme } from '../../theme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import type { IconType } from './types';

interface Props {
  icon: IconType;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Custom element on the right (e.g. a Switch). Replaces the chevron. */
  right?: React.ReactNode;
  destructive?: boolean;
  last?: boolean;
}

/** Compact settings-style row. Stack inside a bordered container. */
export function ListRow({ icon: Icon, title, subtitle, onPress, right, destructive, last }: Props) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : colors.text;

  const content = (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}>
      <View
        style={[
          styles.icon,
          { backgroundColor: destructive ? colors.dangerSoft : colors.surfaceAlt },
        ]}>
        <Icon size={18} color={tint} strokeWidth={2} />
      </View>
      <View style={styles.texts}>
        <Text variant="bodyStrong" color={destructive ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={18} color={colors.textTertiary} /> : null)}
    </View>
  );

  if (!onPress) {
    return content;
  }
  return (
    <PressableScale onPress={onPress} scaleTo={0.995} accessibilityRole="button">
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, marginLeft: 12 },
});
