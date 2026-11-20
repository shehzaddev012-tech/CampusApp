import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronRight, QrCode, TicketX } from 'lucide-react-native';

import { Badge, EmptyState, PatternArt, PressableScale, SegmentedControl, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useEvents } from '../../store/eventStore';
import { GUTTER, PALETTE, radius, useTheme } from '../../theme';
import { dateLabel, timeLabel } from '../../utils/eventTime';
import { categoryArt } from './eventArt';

type Props = NativeStackScreenProps<AppStackParamList, 'MyTickets'>;
type Tab = 'upcoming' | 'past';

export function MyTicketsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const events = useEvents(s => s.events);
  const rsvps = useEvents(s => s.rsvps);
  const passes = useEvents(s => s.passes);
  const [tab, setTab] = useState<Tab>('upcoming');

  const now = Date.now();
  const mine = useMemo(
    () =>
      events
        .filter(e => rsvps[e.id] && (rsvps[e.id].status === 'going' || rsvps[e.id].status === 'waitlist'))
        .filter(e => (tab === 'upcoming' ? e.endsAt >= now : e.endsAt < now))
        .sort((a, b) => (tab === 'upcoming' ? a.startsAt - b.startsAt : b.startsAt - a.startsAt)),
    [events, rsvps, tab, now],
  );
  const myPasses = passes.filter(p => tab === 'upcoming' && p.status !== 'rejected');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="My tickets" onBack={() => navigation.goBack()} />
      <View style={styles.tabs}>
        <SegmentedControl<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'past', label: 'Past' },
          ]}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {mine.length === 0 && myPasses.length === 0 ? (
          <EmptyState
            icon={TicketX}
            title={tab === 'upcoming' ? 'No tickets yet' : 'No past events'}
            message={tab === 'upcoming' ? 'Join an event and your QR ticket will appear here.' : 'Events you attended will be listed here.'}
            actionLabel={tab === 'upcoming' ? 'Browse events' : undefined}
            onAction={() => navigation.goBack()}
          />
        ) : null}

        {mine.map(e => {
          const r = rsvps[e.id];
          const art = categoryArt(colors, e.category);
          const waiting = r.status === 'waitlist';
          return (
            <PressableScale
              key={e.id}
              scaleTo={0.99}
              accessibilityRole="button"
              onPress={() => navigation.navigate(waiting || tab === 'past' ? 'EventDetail' : 'Ticket', { eventId: e.id })}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <PatternArt kind={art.kind} bg={art.bg} fg={art.fg} style={styles.cardArt}>
                <View style={styles.cardArtIcon}>
                  <QrCode size={26} color={PALETTE.ink} strokeWidth={2} />
                </View>
              </PatternArt>
              <View style={styles.cardBody}>
                <View style={styles.badges}>
                  {waiting ? <Badge label="Waitlist" tone="yellow" /> : null}
                  {r.checkedInAt ? <Badge label="Checked in" tone="success" /> : null}
                  {!waiting && !r.checkedInAt && tab === 'upcoming' ? <Badge label="Ticket ready" tone="primary" /> : null}
                </View>
                <Text variant="cardTitle" numberOfLines={1} style={styles.cardTitle}>
                  {e.title}
                </Text>
                <Text variant="small" color="textSecondary" numberOfLines={1}>
                  {dateLabel(e.startsAt)} · {timeLabel(e.startsAt)}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} />
            </PressableScale>
          );
        })}

        {myPasses.length > 0 ? (
          <View style={styles.passes}>
            <Text variant="overline" color="textSecondary" style={styles.passesTitle}>
              GUEST PASSES
            </Text>
            {myPasses.map(p => (
              <PressableScale
                key={p.id}
                scaleTo={0.99}
                onPress={() => navigation.navigate('GuestPass', { eventId: p.eventId })}
                style={[styles.pass, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardBody}>
                  <Text variant="cardTitle" numberOfLines={1}>
                    {p.guestName}
                  </Text>
                  <Text variant="small" color="textSecondary" numberOfLines={1}>
                    {p.eventTitle}
                  </Text>
                </View>
                <Badge
                  label={p.checkedInAt ? 'Used' : p.status === 'approved' ? 'Approved' : 'Pending'}
                  tone={p.checkedInAt ? 'neutral' : p.status === 'approved' ? 'success' : 'warning'}
                />
              </PressableScale>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { paddingHorizontal: GUTTER, paddingTop: 16 },
  content: { paddingHorizontal: GUTTER, paddingTop: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.xl, padding: 12 },
  cardArt: { width: 64, height: 64, borderRadius: 18 },
  cardArtIcon: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, marginHorizontal: 14 },
  badges: { flexDirection: 'row', gap: 6 },
  cardTitle: { marginTop: 6, marginBottom: 2 },
  passes: { marginTop: 14, gap: 10 },
  passesTitle: { marginBottom: 2 },
  pass: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.lg, padding: 14 },
});
