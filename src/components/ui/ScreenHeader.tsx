import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './Text';

interface Props {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

/** Large page title used at the top of tab screens. */
export function ScreenHeader({ title, subtitle, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text variant="title1">{title}</Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary" style={styles.sub}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  texts: { flex: 1 },
  sub: { marginTop: 2 },
  right: { marginLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
