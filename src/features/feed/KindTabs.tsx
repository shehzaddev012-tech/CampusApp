import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { PressableScale, Text } from '../../components/ui';
import { useTheme } from '../../theme';
import type { PostKind } from '../../types/domain';

export type KindFilter = 'all' | PostKind;

const TABS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'official', label: 'Official' },
  { key: 'society', label: 'Societies' },
  { key: 'alert', label: 'Alerts' },
];

interface Props {
  value: KindFilter;
  onChange: (v: KindFilter) => void;
  /** Negative side margin used to run the strip edge to edge inside a padded screen. */
  bleed?: boolean;
}

/** Text tabs with an ink underline: All, Official, Societies, Alerts. */
export function KindTabs({ value, onChange, bleed }: Props) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={bleed ? styles.bleed : undefined}
      contentContainerStyle={[styles.content, bleed && styles.contentBleed]}>
      {TABS.map(t => {
        const active = value === t.key;
        return (
          <PressableScale
            key={t.key}
            onPress={() => onChange(t.key)}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.tab, { borderBottomColor: active ? colors.text : 'transparent' }]}>
            <Text variant="smallStrong" color={active ? 'text' : 'textTertiary'}>
              {t.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -20 },
  content: { gap: 22 },
  contentBleed: { paddingHorizontal: 20 },
  tab: { paddingVertical: 8, borderBottomWidth: 2 },
});
