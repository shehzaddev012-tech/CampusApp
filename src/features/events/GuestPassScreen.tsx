import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Phone, User, UserX } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { Badge, Button, Card, EmptyState, Input, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useEvents } from '../../store/eventStore';
import { useSession } from '../../store/sessionStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { GuestPass, MAX_GUESTS_PER_STUDENT } from '../../types/domain';
import { dateLabel, timeLabel } from '../../utils/eventTime';
import { encodeGuestPass, shortCode } from '../../utils/ticket';

type Props = NativeStackScreenProps<AppStackParamList, 'GuestPass'>;

export function GuestPassScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const event = useEvents(s => s.events.find(e => e.id === eventId));
  const allPasses = useEvents(s => s.passes);
  const passes = useMemo(
    () => allPasses.filter(p => p.eventId === eventId && p.status !== 'rejected'),
    [allPasses, eventId],
  );
  const rejected = useMemo(
    () => allPasses.filter(p => p.eventId === eventId && p.status === 'rejected'),
    [allPasses, eventId],
  );
  const createPass = useEvents(s => s.createPass);
  const membership = useSession(s => s.membership);
  const show = useToast(s => s.show);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  if (!event || !membership) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar title="Guest passes" onBack={() => navigation.goBack()} />
        <EmptyState icon={UserX} title="Event not found" />
      </View>
    );
  }

  const left = MAX_GUESTS_PER_STUDENT - passes.length;
  const nameOk = name.trim().length >= 2;
  const phoneOk = phone.replace(/\D/g, '').length >= 10;

  const submit = async () => {
    setTouched(true);
    if (!nameOk || !phoneOk || left <= 0) {
      return;
    }
    setBusy(true);
    const ok = await createPass(event, name, phone);
    setBusy(false);
    if (ok) {
      setName('');
      setPhone('');
      setTouched(false);
      show({ title: 'Guest pass requested', body: 'It works at the gate once the society approves it.', tone: 'success' });
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TopBar title="Guest passes" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text variant="title2">{event.title}</Text>
        <Text variant="small" color="textSecondary" style={styles.sub}>
          {dateLabel(event.startsAt)} · {timeLabel(event.startsAt)} · {event.venue}
        </Text>

        <Card tone="sage" padding={14} style={styles.limit}>
          <Text variant="bodyStrong">
            {passes.length} of {MAX_GUESTS_PER_STUDENT} guest passes used
          </Text>
          <Text variant="small" color="textSecondary">
            Each guest needs a pass. The society approves it, then your guest shows the QR code at the gate.
          </Text>
        </Card>

        {left > 0 ? (
          <View style={styles.form}>
            <Text variant="title3" style={styles.formTitle}>
              Add a guest
            </Text>
            <Input
              label="Guest name"
              icon={User}
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              error={touched && !nameOk ? 'Enter your guest’s name' : null}
            />
            <View style={styles.gap} />
            <Input
              label="Guest phone number"
              icon={Phone}
              placeholder="03xx xxxxxxx"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              error={touched && !phoneOk ? 'Enter a valid phone number' : null}
            />
            <Button title="Request guest pass" onPress={submit} loading={busy} style={styles.submit} />
          </View>
        ) : null}

        {passes.length > 0 ? (
          <View style={styles.list}>
            <Text variant="title3" style={styles.formTitle}>
              Your guests
            </Text>
            {passes.map(p => (
              <PassCard key={p.id} pass={p} universityId={membership.universityId} />
            ))}
          </View>
        ) : null}

        {rejected.length > 0 ? (
          <Text variant="small" color="textSecondary" style={styles.rejected}>
            {rejected.length} pass{rejected.length === 1 ? ' was' : 'es were'} not approved and do not count toward your limit.
          </Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PassCard({ pass, universityId }: { pass: GuestPass; universityId: string }) {
  const used = !!pass.checkedInAt;
  const approved = pass.status === 'approved';
  return (
    <Card padding={16} style={styles.pass}>
      <View style={styles.passHead}>
        <View style={styles.passText}>
          <Text variant="cardTitle" numberOfLines={1}>
            {pass.guestName}
          </Text>
          <Text variant="small" color="textSecondary">
            {pass.guestPhone}
          </Text>
        </View>
        <Badge label={used ? 'Used' : approved ? 'Approved' : 'Waiting for approval'} tone={used ? 'neutral' : approved ? 'success' : 'warning'} />
      </View>
      {approved && !used ? (
        <View style={styles.qrWrap}>
          <View style={styles.qrBox}>
            <QRCode value={encodeGuestPass(universityId, pass.eventId, pass.id, pass.code)} size={170} color="#14231D" backgroundColor="#FFFFFF" ecl="M" />
          </View>
          <Text variant="overline" color="textSecondary" style={styles.qrCode}>
            {shortCode(pass.code)}
          </Text>
          <Text variant="small" color="textSecondary" align="center">
            Send a screenshot of this code to your guest.
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 20 },
  sub: { marginTop: 4 },
  limit: { marginTop: 18 },
  form: { marginTop: 26 },
  formTitle: { marginBottom: 14 },
  gap: { height: 14 },
  submit: { marginTop: 20 },
  list: { marginTop: 30, gap: 12 },
  pass: { marginBottom: 0 },
  passHead: { flexDirection: 'row', alignItems: 'center' },
  passText: { flex: 1, marginRight: 10 },
  qrWrap: { alignItems: 'center', marginTop: 16, gap: 6 },
  qrBox: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#E5E8E1' },
  qrCode: { marginTop: 4 },
  rejected: { marginTop: 18 },
});
