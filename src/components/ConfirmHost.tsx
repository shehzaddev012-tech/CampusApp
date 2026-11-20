import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { CircleAlert, CircleHelp } from 'lucide-react-native';

import { useConfirm } from '../store/confirmStore';
import { PALETTE, useTheme } from '../theme';
import { Button, Text } from './ui';

/** The "Are you sure?" popup. Mounted once, above the navigator. Back button / tap outside = cancel. */
export function ConfirmHost() {
  const request = useConfirm(s => s.request);
  const answer = useConfirm(s => s.answer);
  const { colors, radius } = useTheme();

  if (!request) {
    return null;
  }
  const danger = (request.tone ?? 'danger') === 'danger';
  const Icon = danger ? CircleAlert : CircleHelp;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={() => answer(false)}>
      <Pressable style={styles.backdrop} onPress={() => answer(false)} accessibilityLabel="Close">
        {/* The card swallows taps so only the dim area outside it cancels. */}
        <Pressable accessibilityRole="alert" style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.xxl }]} onPress={() => undefined}>
          <View style={[styles.icon, { backgroundColor: danger ? colors.coral : colors.primary }]}>
            <Icon size={26} color={PALETTE.ink} strokeWidth={2.2} />
          </View>
          <Text variant="title2" align="center" style={styles.title}>
            {request.title}
          </Text>
          {request.message ? (
            <Text variant="body" color="textSecondary" align="center" style={styles.message}>
              {request.message}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            <View style={styles.flex}>
              <Button title={request.cancelLabel ?? 'Cancel'} variant="soft" size="md" onPress={() => answer(false)} />
            </View>
            <View style={styles.flex}>
              <Button title={request.confirmLabel ?? 'Yes'} variant={danger ? 'danger' : 'primary'} size="md" onPress={() => answer(true)} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(14,24,20,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 380, padding: 24, alignItems: 'center' },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16 },
  message: { marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 24, alignSelf: 'stretch' },
  flex: { flex: 1 },
});
