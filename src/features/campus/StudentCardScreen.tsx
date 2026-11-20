import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { IdCard } from 'lucide-react-native';

import { Avatar, Badge, Button, EmptyState, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { GUTTER, PALETTE, useTheme } from '../../theme';
import { ROLE_LABEL, StudentCard } from '../../types/domain';

type Props = NativeStackScreenProps<AppStackParamList, 'StudentCard'>;

/**
 * The digital student card. The QR is signed by the server and changes every 30 seconds, so a
 * screenshot of it is useless. The card refreshes itself just before the code runs out.
 */
export function StudentCardScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [card, setCard] = useState<StudentCard | null>(null);
  const [failed, setFailed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const c = await backend.card.get();
      setCard(c);
      setFailed(false);
      if (timer.current) {
        clearTimeout(timer.current);
      }
      // Fetch the next code a few seconds before this one expires.
      timer.current = setTimeout(load, Math.max(3_000, c.refreshAt - Date.now() - 4_000));
    } catch {
      setFailed(true);
      timer.current = setTimeout(load, 8_000);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setSeconds(card ? Math.max(0, Math.ceil((card.refreshAt - Date.now()) / 1000)) : 0), 500);
    return () => clearInterval(tick);
  }, [card]);

  return (
    <View style={[styles.root, { backgroundColor: PALETTE.ink }]}>
      <TopBar title="Student card" onBack={() => navigation.goBack()} />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {!card ? (
          failed ? (
            <EmptyState icon={IdCard} title="Could not load your card" message="Check your connection. It will try again." />
          ) : (
            <ActivityIndicator color={PALETTE.green} style={styles.loader} />
          )
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <View style={styles.cardHead}>
                <Text variant="overline" color="textSecondary">
                  {card.university.fullName.toUpperCase()}
                </Text>
                <Badge label={ROLE_LABEL[card.role]} tone="primary" />
              </View>
              <View style={styles.person}>
                <Avatar name={card.name} uri={card.photoUrl} size={64} />
                <View style={styles.personText}>
                  <Text variant="title2" numberOfLines={2}>
                    {card.name}
                  </Text>
                  <Text variant="bodyStrong" color="textSecondary">
                    {card.studentId}
                  </Text>
                  <Text variant="small" color="textSecondary">
                    {card.department} · Batch {card.batch}
                  </Text>
                </View>
              </View>
              <View style={styles.qrWrap}>
                <View style={styles.qrBox} accessible accessibilityLabel="Your student card QR code. It changes every 30 seconds.">
                  <QRCode value={card.payload} size={210} color={PALETTE.ink} backgroundColor="#FFFFFF" ecl="M" />
                </View>
              </View>
              <Text variant="small" color="textSecondary" align="center">
                Changes in {seconds}s
              </Text>
            </View>
            <Text variant="small" color="rgba(247,246,240,0.7)" align="center" style={styles.note}>
              Show this to gate staff or at the library. It is checked live, so a screenshot will not work.
            </Text>
            <Button title="Refresh now" variant="soft" size="md" onPress={load} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: GUTTER, justifyContent: 'center' },
  loader: { alignSelf: 'center' },
  card: { borderRadius: 28, padding: 22 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  person: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  personText: { flex: 1, marginLeft: 14 },
  qrWrap: { alignItems: 'center', marginVertical: 22 },
  qrBox: { padding: 14, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E3E1D6' },
  note: { marginVertical: 18 },
});
