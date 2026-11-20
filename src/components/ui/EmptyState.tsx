import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { Button } from './Button';
import { Text } from './Text';
import type { IconType } from './types';

interface Props {
  icon: IconType;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.bubble, { backgroundColor: colors.surfaceAlt }]}>
        <Icon size={30} color={colors.text} strokeWidth={1.8} />
      </View>
      <Text variant="title3" align="center" style={styles.title}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textSecondary" align="center">
          {message}
        </Text>
      ) : null}
      {actionLabel ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} size="md" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  bubble: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  title: { marginBottom: 6 },
  action: { marginTop: 20 },
});
