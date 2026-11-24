import React, { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, ScrollView, StyleSheet, TextInput, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { CircleAlert, CircleCheck, CircleX, Clock3, ShieldOff, UserCheck } from 'lucide-react-native';

import { Button, Card, Chip, EmptyState, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useEvents } from '../../store/eventStore';
import { useSession } from '../../store/sessionStore';
import { GUTTER, PALETTE, radius, useTheme } from '../../theme';
import { CheckInResult, canScan } from '../../types/domain';
import { eventPhase, timeLabel } from '../../utils/eventTime';
import { backend } from '../../services';
import { isCardPayload, parsePayload } from '../../utils/ticket';

type Props = NativeStackScreenProps<AppStackParamList, 'Scanner'>;

const SAME_CODE_COOLDOWN_MS = 2500;

export function ScannerScreen({ navigation, route }: Props) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const role = useSession(s => s.membership?.role);

  const events = useEvents(s => s.events);
  const pendingCount = useEvents(s => s.pending.length);
  const checkIn = useEvents(s => s.checkIn);

  const choices = useMemo(
    () => events.filter(e => eventPhase(e) !== 'ended' && e.startsAt < Date.now() + 2 * 24 * 3_600_000),
    [events],
  );
  const [selected, setSelected] = useState<string | undefined>(route.params?.eventId ?? choices[0]?.id);
  const event = events.find(e => e.id === selected);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [result, setResult] = useState<CheckInResult | null>(null);
  const [manual, setManual] = useState('');
  const last = useRef<{ payload: string; at: number }>({ payload: '', at: 0 });
  const working = useRef(false);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // The short code printed under a ticket's QR (ES52-VPIN); it needs an event picked above.
  const isShort = /^[a-z0-9]{4}-?[a-z0-9]{4}$/i.test(manual.trim());
  const canCheck = !!parsePayload(manual) || isCardPayload(manual) || (isShort && !!selected);

  const handle = useCallback(
    async (payload: string) => {
      const now = Date.now();
      if (working.current || (payload === last.current.payload && now - last.current.at < SAME_CODE_COOLDOWN_MS)) {
        return;
      }
      working.current = true;
      last.current = { payload, at: now };
      let res: CheckInResult;
      if (isCardPayload(payload)) {
        // A student card, not a ticket: only says who the person is.
        try {
          const v = await backend.card.verify(payload);
          res = v.ok
            ? { ok: true, kind: 'card', name: v.name, detail: `${v.studentId} · ${v.department}` }
            : { ok: false, reason: 'not_valid', name: v.name, detail: v.detail };
        } catch {
          res = { ok: false, reason: 'invalid', detail: 'Could not check this card. Check your connection.' };
        }
      } else {
        res = await checkIn(payload, selected);
      }
      try {
        Vibration.vibrate(res.ok ? 60 : [0, 120, 80, 120]);
      } catch {
        // Haptics are a nicety; never let them break a scan.
      }
      setResult(res);
      working.current = false;
    },
    [checkIn, selected],
  );

  const scanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      const value = codes[0]?.value;
      if (value && !result) {
        handle(value);
      }
    },
  });

  if (!role || !canScan(role)) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar title="Gate scanner" onBack={() => navigation.goBack()} />
        <EmptyState icon={ShieldOff} title="Staff only" message="Only gate security, society heads and admins can scan tickets." />
      </View>
    );
  }

  const cameraOn = focused && !result && hasPermission && !!device;
  const ok = result?.ok === true;

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar
        title="Gate scanner"
        onBack={() => navigation.goBack()}
        right={
          pendingCount > 0 ? (
            <PressableScale onPress={() => navigation.navigate('GuestApprovals')} accessibilityRole="button" style={[styles.approvals, { backgroundColor: colors.yellow }]}>
              <UserCheck size={16} color={PALETTE.ink} strokeWidth={2.4} />
              <Text variant="smallStrong" color={PALETTE.ink} style={styles.approvalsText}>
                {pendingCount}
              </Text>
            </PressableScale>
          ) : null
        }
      />

      <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {
          <>
            {choices.length === 0 ? (
              <Card padding={14} tone="sage">
                <View style={styles.noEvents}>
                  <Clock3 size={18} color={colors.text} strokeWidth={2.2} />
                  <Text variant="small" color="textSecondary" style={styles.noEventsText}>
                    No event is open for check-in right now. You can still verify student cards.
                  </Text>
                </View>
              </Card>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
                {choices.map(e => (
                  <Chip key={e.id} label={e.title} selected={selected === e.id} onPress={() => setSelected(e.id)} />
                ))}
              </ScrollView>
            )}

            {event ? (
              <Card padding={14} tone="sage" style={styles.counter}>
                <Text variant="overline" color="textSecondary">
                  CHECKED IN
                </Text>
                <View style={styles.counterRow}>
                  <Text variant="title1">{event.checkedInCount}</Text>
                  <Text variant="body" color="textSecondary" style={styles.counterOf}>
                    of {event.goingCount} tickets
                  </Text>
                </View>
              </Card>
            ) : null}

            {/* Camera */}
            <View style={[styles.camera, { backgroundColor: PALETTE.ink, borderRadius: radius.xxl }]}>
              {!hasPermission ? (
                <View style={styles.cameraMsg}>
                  <Text variant="bodyStrong" color={PALETTE.paper} align="center">
                    Camera access is needed to scan tickets
                  </Text>
                  <Button title="Allow camera" size="md" fullWidth={false} onPress={async () => {
                      const granted = await requestPermission();
                      if (!granted) {
                        Linking.openSettings();
                      }
                    }} style={styles.cameraBtn} />
                </View>
              ) : !device ? (
                <View style={styles.cameraMsg}>
                  <Text variant="bodyStrong" color={PALETTE.paper} align="center">
                    No camera found on this device
                  </Text>
                  <Text variant="small" color="rgba(247,246,240,0.7)" align="center" style={styles.cameraHint}>
                    Use manual entry below.
                  </Text>
                </View>
              ) : (
                <>
                  <Camera style={StyleSheet.absoluteFill} device={device} isActive={cameraOn} codeScanner={scanner} />
                  <View pointerEvents="none" style={styles.frameWrap}>
                    <View style={[styles.frame, { borderColor: colors.primary }]} />
                  </View>
                </>
              )}
            </View>
            <Text variant="small" color="textSecondary" align="center" style={styles.tip}>
              Point the camera at a ticket, guest pass or student card.
            </Text>

            {/* Manual entry */}
            <Text variant="smallStrong" style={styles.manualLabel}>
              Enter code manually
            </Text>
            <View style={[styles.manualRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={manual}
                onChangeText={setManual}
                placeholder="Ticket code, e.g. ES52-VPIN"
                onFocus={() => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 250)}
                returnKeyType="done"
                placeholderTextColor={colors.textTertiary}
                selectionColor={colors.text}
                autoCapitalize="none"
                autoCorrect={false}
                style={[typography.body, styles.manualInput, { color: colors.text }]}
              />
              <Button
                title="Check"
                size="md"
                fullWidth={false}
                disabled={!canCheck}
                onPress={() => {
                  handle(manual.trim());
                  setManual('');
                }}
              />
            </View>
            {isShort && !selected ? (
              <Text variant="caption" color="textSecondary" style={styles.tip}>
                Pick the event at the top first, then the code can be checked.
              </Text>
            ) : null}
          </>
        }
      </ScrollView>

      {/* Result */}
      {result ? (
        <View style={[styles.resultWrap, { paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.result, { backgroundColor: ok ? colors.primary : colors.coral, borderRadius: radius.xxl }]}>
            {ok ? (
              <CircleCheck size={44} color={PALETTE.ink} strokeWidth={2} />
            ) : result.reason === 'already_used' || result.reason === 'pending' ? (
              <CircleAlert size={44} color={PALETTE.ink} strokeWidth={2} />
            ) : (
              <CircleX size={44} color={PALETTE.ink} strokeWidth={2} />
            )}
            <Text variant="title1" color={PALETTE.ink} style={styles.resultTitle}>
              {ok ? (result.kind === 'card' ? 'Verified' : 'Welcome in') : result.reason === 'already_used' ? 'Already used' : result.reason === 'pending' ? 'Not approved yet' : result.reason === 'closed' ? 'Not open yet' : 'Not valid'}
            </Text>
            {result.name ? (
              <Text variant="title3" color={PALETTE.ink}>
                {result.name}
              </Text>
            ) : null}
            <Text variant="body" color={PALETTE.ink} align="center" style={styles.resultDetail}>
              {result.ok ? `${result.kind === 'guest' ? 'Guest pass' : result.kind === 'card' ? 'Student card' : 'Student ticket'} · ${result.detail}` : result.detail}
            </Text>
            <Button title="Scan next" variant="secondary" style={styles.resultBtn} onPress={() => { setResult(null); last.current = { payload: '', at: 0 }; }} />
            {ok ? (
              <Text variant="caption" color={PALETTE.ink} style={styles.resultTime}>
                Checked in at {timeLabel(Date.now())}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
  approvals: { flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: 14, borderRadius: 20 },
  approvalsText: { marginLeft: 6 },
  noEvents: { flexDirection: 'row', alignItems: 'center' },
  noEventsText: { flex: 1, marginLeft: 10 },
  chips: { marginHorizontal: -GUTTER },
  chipsContent: { paddingHorizontal: GUTTER, gap: 8 },
  counter: { marginTop: 14 },
  counterRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  counterOf: { marginLeft: 8 },
  camera: { height: 320, marginTop: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cameraMsg: { padding: 24, alignItems: 'center' },
  cameraBtn: { marginTop: 14 },
  cameraHint: { marginTop: 6 },
  frameWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 220, height: 220, borderRadius: 28, borderWidth: 3 },
  tip: { marginTop: 12 },
  manualLabel: { marginTop: 26, marginBottom: 10 },
  manualRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, gap: 8 },
  manualInput: { flex: 1, paddingVertical: 0 },
  resultWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER },
  result: { padding: 24, alignItems: 'center', elevation: 12, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  resultTitle: { marginTop: 10 },
  resultDetail: { marginTop: 6 },
  resultBtn: { marginTop: 18, alignSelf: 'stretch' },
  resultTime: { marginTop: 10, opacity: 0.8 },
});
