import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CircleCheck, Clock, MapPin, TicketX } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { Badge, Button, EmptyState, PatternArt, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useEvents } from '../../store/eventStore';
import { useSession } from '../../store/sessionStore';
import { GUTTER, PALETTE, useTheme } from '../../theme';
import { dateLabel, timeLabel } from '../../utils/eventTime';
import { encodeTicket, shortCode } from '../../utils/ticket';
import { categoryArt } from './eventArt';

type Props = NativeStackScreenProps<AppStackParamList, 'Ticket'>;

/** The student's ticket. The QR always sits on white so scanners can read it in dark mode too. */
export function TicketScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const event = useEvents(s => s.events.find(e => e.id === eventId));
  const rsvp = useEvents(s => s.rsvps[eventId]);
  const membership = useSession(s => s.membership);

  if (!event || !rsvp || rsvp.status !== 'going' || !rsvp.code || !membership) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar title="Ticket" onBack={() => navigation.goBack()} />
        <EmptyState
          icon={TicketX}
          title="No ticket for this event"
          message="Get a ticket from the event page to see your QR code here."
          actionLabel="Open event"
          onAction={() => navigation.replace('EventDetail', { eventId })}
        />
      </View>
    );
  }

  const art = categoryArt(colors, event.category);
  const used = !!rsvp.checkedInAt;
  const value = encodeTicket(membership.universityId, event.id, membership.uid, rsvp.code);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="My ticket" onBack={() => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.ticket, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xxl }]}>
          <PatternArt kind={art.kind} bg={art.bg} fg={art.fg} style={styles.head}>
            <View style={styles.headContent}>
              <Badge label={event.category} tone="ink" />
              <Text variant="title2" color={PALETTE.ink} numberOfLines={2}>
                {event.title}
              </Text>
            </View>
          </PatternArt>

          <View style={styles.cut}>
            <View style={[styles.notch, styles.notchLeft, { backgroundColor: colors.background }]} />
            <View style={[styles.dashed, { borderColor: colors.border }]} />
            <View style={[styles.notch, styles.notchRight, { backgroundColor: colors.background }]} />
          </View>

          <View style={styles.qrWrap}>
            <View style={styles.qrBox}>
              <QRCode value={value} size={200} color="#14231D" backgroundColor="#FFFFFF" ecl="M" />
              {used ? (
                <View style={styles.usedOverlay}>
                  <CircleCheck size={56} color="#14231D" strokeWidth={2} />
                  <Text variant="title3" color={PALETTE.ink} style={styles.usedText}>
                    Checked in
                  </Text>
                  <Text variant="small" color={PALETTE.ink}>
                    {timeLabel(rsvp.checkedInAt as number)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="overline" color="textSecondary" style={styles.code}>
              {shortCode(rsvp.code)}
            </Text>
          </View>

          <View style={styles.info}>
            <Row label="Name" value={membership.name} />
            <Row label="Student ID" value={membership.studentId} />
            <View style={styles.inline}>
              <Clock size={15} color={colors.textSecondary} />
              <Text variant="small" color="textSecondary" style={styles.inlineText}>
                {dateLabel(event.startsAt)} · {timeLabel(event.startsAt)}
              </Text>
            </View>
            <View style={styles.inline}>
              <MapPin size={15} color={colors.textSecondary} />
              <Text variant="small" color="textSecondary" style={styles.inlineText}>
                {event.venue}
              </Text>
            </View>
          </View>
        </View>

        <Text variant="small" color="textSecondary" align="center" style={styles.hint}>
          {used
            ? 'This ticket has been used and cannot enter again.'
            : 'Show this code at the gate. Turn your screen brightness up for faster scanning.'}
        </Text>
        <Button
          title="Event details"
          variant="soft"
          onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
          style={styles.btn}
        />
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="small" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong" numberOfLines={1} style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 24 },
  ticket: { borderWidth: 1, overflow: 'hidden' },
  head: { height: 120 },
  headContent: { flex: 1, padding: 18, justifyContent: 'space-between' },
  cut: { height: 24, justifyContent: 'center' },
  dashed: { borderTopWidth: 1.5, borderStyle: 'dashed', marginHorizontal: 22 },
  notch: { position: 'absolute', width: 24, height: 24, borderRadius: 12, top: 0 },
  notchLeft: { left: -12 },
  notchRight: { right: -12 },
  qrWrap: { alignItems: 'center', paddingTop: 8, paddingBottom: 6 },
  qrBox: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E5E8E1' },
  usedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(199,243,107,0.94)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usedText: { marginTop: 8 },
  code: { marginTop: 12 },
  info: { padding: 20, paddingTop: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowValue: { flexShrink: 1, marginLeft: 16, textAlign: 'right' },
  inline: { flexDirection: 'row', alignItems: 'center' },
  inlineText: { marginLeft: 8, flex: 1 },
  hint: { marginTop: 20, paddingHorizontal: 12 },
  btn: { marginTop: 20 },
});
