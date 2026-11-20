import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, radius } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.item,
              { borderRadius: radius.sm + 1 },
              active && { backgroundColor: colors.text },
            ]}>
            <Text variant="smallStrong" color={active ? colors.background : 'textSecondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 4 },
  item: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
});
