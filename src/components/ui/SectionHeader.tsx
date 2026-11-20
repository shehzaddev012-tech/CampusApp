import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

interface Props {
  title: string;
  /** Short overline above the title, e.g. "THIS WEEK". */
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, eyebrow, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        {eyebrow ? (
          <Text variant="overline" color="textSecondary" style={styles.eyebrow}>
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <Text variant="title2">{title}</Text>
      </View>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          hitSlop={10}
          accessibilityRole="button"
          style={styles.action}>
          <Text variant="smallStrong">{actionLabel}</Text>
          <ArrowUpRight size={15} color={colors.text} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  texts: { flex: 1 },
  eyebrow: { marginBottom: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 3 },
});
