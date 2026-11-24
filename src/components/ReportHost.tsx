import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Flag } from 'lucide-react-native';

import { useReportDialog } from '../store/reportStore';
import { PALETTE, useTheme } from '../theme';
import { Button, Text } from './ui';

/** "Report this ...?" popup. A tap outside does nothing: it closes only with Cancel (or the Android back button). */
export function ReportHost() {
  const what = useReportDialog(s => s.what);
  const onPick = useReportDialog(s => s.onPick);
  const close = useReportDialog(s => s.close);
  const { colors, radius } = useTheme();

  if (!what) {
    return null;
  }
  const pick = (reason: 'spam' | 'inappropriate' | 'scam') => {
    close();
    onPick?.(reason);
  };

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View accessibilityRole="alert" style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xxl }]}>
          <View style={[styles.icon, { backgroundColor: colors.coral }]}>
            <Flag size={24} color={PALETTE.ink} strokeWidth={2.2} />
          </View>
          <Text variant="title2" align="center" style={styles.title}>
            {`Report this ${what}?`}
          </Text>
          <Text variant="body" color="textSecondary" align="center" style={styles.message}>
            Why are you reporting it?
          </Text>
          <View style={styles.list}>
            <Button title="Scam or fake" variant="soft" size="md" onPress={() => pick('scam')} />
            <Button title="Inappropriate" variant="soft" size="md" onPress={() => pick('inappropriate')} />
            <Button title="Spam" variant="soft" size="md" onPress={() => pick('spam')} />
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.cancel}>
              <Text variant="bodyStrong" color="textSecondary">
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(14,24,20,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 380, padding: 24, alignItems: 'center' },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 14 },
  message: { marginTop: 6 },
  list: { alignSelf: 'stretch', gap: 10, marginTop: 20 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
