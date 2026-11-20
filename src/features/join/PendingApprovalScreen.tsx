import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Clock, Hourglass, LogOut, ShieldX } from 'lucide-react-native';

import { Badge, Button, Card, PatternArt, Screen, Text } from '../../components/ui';
import { useSession } from '../../store/sessionStore';
import { PALETTE, useTheme } from '../../theme';
import { confirm } from '../../utils/confirm';

/** Shown while the membership request is pending, rejected or suspended. */
export function PendingApprovalScreen() {
  const { colors } = useTheme();
  const status = useSession(s => s.status);
  const membership = useSession(s => s.membership);
  const university = useSession(s => s.university);
  const signOut = useSession(s => s.signOut);
  const leave = useSession(s => s.leaveUniversity);

  const rejected = status === 'rejected';
  const Icon = rejected ? ShieldX : Hourglass;

  const confirmLeave = async () => {
    const ok = await confirm({
      title: rejected ? 'Choose another university?' : 'Cancel this request?',
      message: 'Your request will be removed and you can pick a different university.',
      confirmLabel: rejected ? 'Choose another' : 'Cancel request',
      cancelLabel: 'Keep',
    });
    if (ok) {
      leave();
    }
  };

  return (
    <Screen scroll>
      <PatternArt
        kind="rings"
        bg={rejected ? colors.coral : colors.yellow}
        fg={PALETTE.ink}
        style={styles.art}>
        <View style={styles.artCenter}>
          <View style={styles.iconCircle}>
            <Icon size={34} color={PALETTE.ink} strokeWidth={2} />
          </View>
        </View>
      </PatternArt>

      <View style={styles.head}>
        <Badge
          label={rejected ? 'Request not approved' : 'Waiting for approval'}
          tone={rejected ? 'danger' : 'warning'}
          icon={rejected ? ShieldX : Clock}
        />
        <Text variant="hero" style={styles.title}>
          {rejected ? 'We could not\nverify you' : 'Request\nsent!'}
        </Text>
        <Text variant="bodyLg" color="textSecondary">
          {rejected
            ? 'Your details did not match the university records. Check your student ID and try again.'
            : `An admin from ${university?.name ?? 'your university'} is verifying your details. You will get a notification the moment you are in.`}
        </Text>
      </View>

      {membership ? (
        <Card style={styles.card} padding={4}>
          <Row label="University" value={university?.fullName ?? membership.universityId} />
          <Row label="Student ID" value={membership.studentId} />
          <Row label="Department" value={membership.department} />
          <Row label="Batch" value={membership.batch} last />
        </Card>
      ) : null}

      <View style={styles.actions}>
        <Button
          title={rejected ? 'Choose another university' : 'Cancel request'}
          variant="soft"
          onPress={confirmLeave}
        />
        <Button title="Sign out" variant="ghost" icon={LogOut} onPress={signOut} />
      </View>
    </Screen>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}>
      <Text variant="small" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong" style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  art: { height: 168, borderRadius: 28, marginTop: 4 },
  artCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  head: { marginTop: 24, gap: 12 },
  title: { marginTop: 2 },
  card: { marginTop: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14 },
  value: { flexShrink: 1, textAlign: 'right', marginLeft: 16 },
  actions: { gap: 12, marginTop: 28 },
});
