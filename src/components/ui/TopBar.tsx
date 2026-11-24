import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, X } from 'lucide-react-native';

import { GUTTER, useTheme } from '../../theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

interface Props {
  title?: string;
  /** A small line under the title (for example "online" or "typing..."). */
  subtitle?: string;
  onBack: () => void;
  /** Use a close (X) button instead of a back arrow, for modal-style screens. */
  close?: boolean;
  right?: React.ReactNode;
}

/** Top bar for screens pushed above the tabs. */
export function TopBar({ title, subtitle, onBack, close, right }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}>
      <IconButton
        icon={close ? X : ArrowLeft}
        onPress={onBack}
        accessibilityLabel={close ? 'Close' : 'Go back'}
      />
      <View style={styles.title}>
        <Text variant="title3" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, marginHorizontal: 12 },
  right: { minWidth: 42, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
