import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CalendarPlus,
  CalendarX,
  Clock,
  HandHeart,
  MapPin,
  Pencil,
  ScanLine,
  Share2,
  Star,
  Ticket,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  PatternArt,
  PressableScale,
  Text,
  TopBar,
} from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useEvents } from '../../store/eventStore';
import { useSession } from '../../store/sessionStore';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { GUTTER, PALETTE, useTheme } from '../../theme';
import { MAX_GUESTS_PER_STUDENT, canScan, seatsLeft } from '../../types/domain';
import {
  calendarUrl,
  dateLabel,
  dayNumber,
  eventPhase,
  monthShort,
  startsInLabel,
  timeLabel,
  weekdayShort,
} from '../../utils/eventTime';
import { confirm } from '../../utils/confirm';
import { useNow } from '../../utils/useNow';
import { categoryArt } from './eventArt';

type Props = NativeStackScreenProps<AppStackParamList, 'EventDetail'>;

export function EventDetailScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();

  const event = useEvents(s => s.events.find(e => e.id === eventId));
  const rsvp = useEvents(s => s.rsvps[eventId]);
  const allPasses = useEvents(s => s.passes);
  const pendingGuests = useEvents(s => s.pending.length);
  // Filter here, not inside the selector: a selector that builds a new array on every call
  // makes zustand think the state changed on every render (infinite loop).
  const passes = useMemo(
    () => allPasses.filter(p => p.eventId === eventId && p.status !== 'rejected'),
    [allPasses, eventId],
  );
  const take = useEvents(s => s.rsvp);
  const cancel = useEvents(s => s.cancel);
  const toggleVolunteer = useEvents(s => s.toggleVolunteer);
  const sendFeedback = useEvents(s => s.sendFeedback);
  const role = useSession(s => s.membership?.role);
  const show = useToast(s => s.show);

  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);

  if (!event) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar onBack={() => navigation.goBack()} />
        <EmptyState icon={CalendarX} title="Event not found" message="It may have been removed by the organiser." />
      </View>
    );
  }

  const art = categoryArt(colors, event.category);
  const phase = eventPhase(event, now);
  const left = seatsLeft(event);
  const full = left === 0;
  const going = rsvp?.status === 'going';
  const waiting = rsvp?.status === 'waitlist';
  const interested = rsvp?.status === 'interested';
  const volunteering = !!rsvp?.volunteer;
  const open = phase !== 'ended';

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  const getTicket = () =>
    run(async () => {
      const result = await take(event.id, 'going');
      if (result?.status === 'going') {
        navigation.navigate('Ticket', { eventId: event.id });
      } else if (result?.status === 'waitlist') {
        show({ title: "You're on the waiting list", body: 'We will notify you if a seat opens up.' });
      }
    });

  const deleteEvent = async () => {
    if (!(await confirm({ title: 'Delete this event?', message: 'Its tickets and guest passes are removed for everyone. This cannot be undone.', confirmLabel: 'Delete event' }))) {
      return;
    }
    try {
      await backend.events.remove(event.id);
      show({ title: 'Event deleted', tone: 'success' });
      navigation.goBack();
    } catch (e) {
      show({ title: 'Could not delete', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  const confirmCancel = async () => {
    const ok = await confirm({
      title: going ? 'Give up your seat?' : waiting ? 'Leave the waiting list?' : 'Remove your interest?',
      message: going ? 'Your ticket will stop working and the seat goes to the next student.' : undefined,
      confirmLabel: going ? 'Give up seat' : 'Leave',
      cancelLabel: 'Keep',
    });
    if (ok) {
      run(() => cancel(event.id));
    }
  };

  const share = () =>
    Share.share({
      message: `${event.title}\n${dateLabel(event.startsAt)} · ${timeLabel(event.startsAt)} at ${event.venue}\nOrganised by ${event.organizer}. Find it on IAC Campus.`,
    }).catch(() => undefined);

  const submitFeedback = async () => {
    if (stars === 0) {
      return;
    }
    setBusy(true);
    const ok = await sendFeedback(event.id, stars, comment);
    setBusy(false);
    if (ok) {
      setSent(true);
      show({ title: 'Thanks for your feedback', tone: 'success' });
    }
  };

  const nextIndex = event.schedule.findIndex(s => s.at > now);
  const nowIndex = phase === 'live' ? (nextIndex === -1 ? event.schedule.length - 1 : nextIndex - 1) : -1;
  const isStaff = !!role && canScan(role);
  const canFeedback = phase === 'ended' && (going || !!rsvp?.checkedInAt);
  const guestsLeft = MAX_GUESTS_PER_STUDENT - passes.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        onBack={() => navigation.goBack()}
        title="Event"
        right={<IconButton icon={Share2} onPress={share} accessibilityLabel="Share event" />}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Poster */}
        <PatternArt kind={art.kind} bg={art.bg} fg={art.fg} style={styles.poster}>
          <View style={styles.posterContent}>
            <View style={styles.badges}>
              <Badge label={event.category} tone="ink" />
              {phase === 'live' ? <Badge label="Live now" tone="coral" /> : null}
              {phase === 'ended' ? <Badge label="Ended" tone="neutral" /> : null}
              {going ? <Badge label="You are going" tone="primary" /> : null}
            </View>
            <View>
              <Text variant="numeral" color={PALETTE.ink}>
                {dayNumber(event.startsAt)}
              </Text>
              <Text variant="overline" color={PALETTE.ink}>
                {monthShort(event.startsAt)} · {weekdayShort(event.startsAt).toUpperCase()}
              </Text>
            </View>
          </View>
        </PatternArt>

        <View style={styles.body}>
          <Text variant="title1">{event.title}</Text>
          <Text variant="smallStrong" color="textSecondary" style={styles.starts}>
            {startsInLabel(event, now)}
          </Text>

          <View style={styles.meta}>
            <MetaRow icon={Clock} text={`${dateLabel(event.startsAt)} · ${timeLabel(event.startsAt)} to ${timeLabel(event.endsAt)}`} />
            <MetaRow icon={MapPin} text={event.venue} />
            <MetaRow icon={Users} text={`Organised by ${event.organizer}`} />
          </View>

          <Text variant="bodyLg" style={styles.blurb}>
            {event.blurb}
          </Text>

          {/* Seats */}
          <Card padding={16} style={styles.seats}>
            <View style={styles.seatsTop}>
              <Text variant="title3">{event.goingCount} going</Text>
              <Text variant="smallStrong" color={full ? 'coralText' : 'textSecondary'}>
                {left === null ? 'Open to everyone' : full ? 'Event is full' : `${left} seats left`}
              </Text>
            </View>
            {event.capacity !== null ? (
              <View style={[styles.bar, { backgroundColor: colors.surfaceAlt }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${Math.min(100, (event.goingCount / event.capacity) * 100)}%`,
                      backgroundColor: full ? colors.coral : colors.primary,
                    },
                  ]}
                />
              </View>
            ) : null}
            <Text variant="caption" color="textSecondary" style={styles.seatsFoot}>
              {event.interestedCount} interested{event.waitlistCount > 0 ? ` · ${event.waitlistCount} on the waiting list` : ''}
            </Text>
          </Card>

          {/* Schedule / live mode */}
          {event.schedule.length > 0 ? (
            <View style={styles.section}>
              <Text variant="title2" style={styles.sectionTitle}>
                {phase === 'live' ? 'Happening now' : 'Schedule'}
              </Text>
              {event.schedule.map((s, i) => {
                const isNow = i === nowIndex;
                const isNext = phase === 'live' && i === nextIndex;
                const past = phase === 'ended' || (phase === 'live' && i < nowIndex);
                return (
                  <View key={`${s.at}-${i}`} style={styles.slot}>
                    <Text variant="smallStrong" color={past ? 'textTertiary' : 'text'} style={styles.slotTime}>
                      {timeLabel(s.at)}
                    </Text>
                    <View
                      style={[
                        styles.slotCard,
                        {
                          borderRadius: radius.lg,
                          backgroundColor: isNow ? colors.primary : colors.surface,
                          borderColor: isNow ? colors.primary : colors.border,
                          opacity: past ? 0.55 : 1,
                        },
                      ]}>
                      {isNow || isNext ? (
                        <Text variant="overline" color={isNow ? PALETTE.ink : 'textSecondary'}>
                          {isNow ? 'NOW' : 'UP NEXT'}
                        </Text>
                      ) : null}
                      <Text variant="cardTitle" color={isNow ? PALETTE.ink : 'text'}>
                        {s.title}
                      </Text>
                      {s.speaker ? (
                        <Text variant="small" color={isNow ? PALETTE.ink : 'textSecondary'}>
                          {s.speaker}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Main action */}
          {open ? (
            <View style={styles.actions}>
              {going ? (
                <>
                  <Button title="View my ticket" icon={Ticket} onPress={() => navigation.navigate('Ticket', { eventId: event.id })} />
                  <Button title="Give up my seat" variant="ghost" onPress={confirmCancel} />
                </>
              ) : waiting ? (
                <>
                  <Card tone="sage" padding={14}>
                    <Text variant="bodyStrong">You are on the waiting list</Text>
                    <Text variant="small" color="textSecondary">
                      If a seat opens you get a ticket automatically and we will notify you.
                    </Text>
                  </Card>
                  <Button title="Leave waiting list" variant="ghost" onPress={confirmCancel} />
                </>
              ) : (
                <>
                  <Button title={full ? 'Join waiting list' : 'Get ticket'} icon={Ticket} loading={busy} onPress={getTicket} />
                  <Button
                    title={interested ? 'Interested (tap to undo)' : "I'm interested"}
                    variant={interested ? 'soft' : 'ghost'}
                    onPress={() => run(() => (interested ? cancel(event.id) : take(event.id, 'interested')))}
                  />
                </>
              )}

              <View style={styles.quick}>
                <QuickAction icon={CalendarPlus} label="Add to calendar" onPress={() => Linking.openURL(calendarUrl(event))} />
                <QuickAction icon={Share2} label="Share" onPress={share} />
              </View>
            </View>
          ) : null}

          {/* Guests */}
          {open && going ? (
            <Card padding={16} style={styles.block}>
              <View style={styles.blockRow}>
                <View style={[styles.blockIcon, { backgroundColor: colors.yellow }]}>
                  <UserPlus size={20} color={PALETTE.ink} strokeWidth={2.2} />
                </View>
                <View style={styles.blockText}>
                  <Text variant="cardTitle">Bring a guest</Text>
                  <Text variant="small" color="textSecondary">
                    {guestsLeft > 0 ? `You can add ${guestsLeft} more guest${guestsLeft === 1 ? '' : 's'}.` : 'You have used all guest passes.'}
                  </Text>
                </View>
              </View>
              <Button
                title="Guest passes"
                variant="soft"
                size="md"
                style={styles.blockBtn}
                onPress={() => navigation.navigate('GuestPass', { eventId: event.id })}
              />
            </Card>
          ) : null}

          {/* Volunteers */}
          {open && event.volunteersNeeded > 0 ? (
            <Card padding={16} style={styles.block}>
              <View style={styles.blockRow}>
                <View style={[styles.blockIcon, { backgroundColor: colors.lavender }]}>
                  <HandHeart size={20} color={PALETTE.ink} strokeWidth={2.2} />
                </View>
                <View style={styles.blockText}>
                  <Text variant="cardTitle">Volunteers needed</Text>
                  <Text variant="small" color="textSecondary">
                    {event.volunteerCount} of {event.volunteersNeeded} signed up
                  </Text>
                </View>
              </View>
              <Button
                title={volunteering ? 'You are volunteering' : 'Volunteer'}
                variant={volunteering ? 'soft' : 'secondary'}
                size="md"
                style={styles.blockBtn}
                onPress={() => toggleVolunteer(event.id)}
              />
            </Card>
          ) : null}

          {/* Feedback */}
          {canFeedback ? (
            <Card padding={16} style={styles.block}>
              <Text variant="title3">How was it?</Text>
              {rsvp?.rating || sent ? (
                <Text variant="body" color="textSecondary" style={styles.thanks}>
                  Thanks! You rated this event {rsvp?.rating ?? stars} out of 5.
                </Text>
              ) : (
                <>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <PressableScale key={n} onPress={() => setStars(n)} accessibilityLabel={`${n} stars`} scaleTo={0.9}>
                        <Star
                          size={32}
                          color={n <= stars ? colors.yellow : colors.textTertiary}
                          fill={n <= stars ? colors.yellow : 'none'}
                          strokeWidth={1.8}
                        />
                      </PressableScale>
                    ))}
                  </View>
                  <Input placeholder="Anything to add? (optional)" value={comment} onChangeText={setComment} maxLength={300} />
                  <Button title="Send feedback" size="md" disabled={stars === 0} loading={busy} onPress={submitFeedback} style={styles.blockBtn} />
                </>
              )}
            </Card>
          ) : null}

          {/* Organiser tools */}
          {isStaff ? (
            <Card tone="sage" padding={16} style={styles.block}>
              <Text variant="overline" color="textSecondary">
                ORGANISER
              </Text>
              <Text variant="title3" style={styles.orgTitle}>
                {event.checkedInCount} of {event.goingCount} checked in
              </Text>
              <Button
                title="Open gate scanner"
                icon={ScanLine}
                size="md"
                style={styles.blockBtn}
                onPress={() => navigation.navigate('Scanner', { eventId: event.id })}
              />
              <Button
                title={pendingGuests > 0 ? `Guest requests (${pendingGuests})` : 'Guest requests'}
                icon={UserCheck}
                variant="soft"
                size="md"
                style={styles.blockBtn}
                onPress={() => navigation.navigate('GuestApprovals')}
              />
              <Button
                title="Who is coming"
                icon={Users}
                variant="soft"
                size="md"
                style={styles.blockBtn}
                onPress={() => navigation.navigate('EventAttendees', { eventId: event.id, title: event.title })}
              />
              <Button title="Edit event" icon={Pencil} variant="soft" size="md" style={styles.blockBtn} onPress={() => navigation.navigate('EventComposer', { eventId: event.id })} />
              <Button title="Delete this event" icon={Trash2} variant="danger" size="md" style={styles.blockBtn} onPress={deleteEvent} />
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function MetaRow({ icon: Icon, text }: { icon: typeof Clock; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Icon size={17} color={colors.textSecondary} strokeWidth={2.1} />
      <Text variant="body" style={styles.metaText}>
        {text}
      </Text>
    </View>
  );
}

function QuickAction({ icon: Icon, label, onPress }: { icon: typeof Clock; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" scaleTo={0.97} style={[styles.quickBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Icon size={18} color={colors.text} strokeWidth={2.1} />
      <Text variant="smallStrong" style={styles.quickText}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  poster: { height: 200 },
  posterContent: { flex: 1, padding: GUTTER, justifyContent: 'space-between' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  body: { paddingHorizontal: GUTTER, paddingTop: 22 },
  starts: { marginTop: 6 },
  meta: { marginTop: 20, gap: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 12, flex: 1 },
  blurb: { marginTop: 20 },
  seats: { marginTop: 22 },
  seatsTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bar: { height: 8, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  seatsFoot: { marginTop: 10 },
  section: { marginTop: 30 },
  sectionTitle: { marginBottom: 14 },
  slot: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  slotTime: { width: 74, paddingTop: 14 },
  slotCard: { flex: 1, borderWidth: 1, padding: 14 },
  actions: { marginTop: 28, gap: 12 },
  quick: { flexDirection: 'row', gap: 10 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 14, borderWidth: 1 },
  quickText: { marginLeft: 8 },
  block: { marginTop: 16 },
  blockRow: { flexDirection: 'row', alignItems: 'center' },
  blockIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  blockText: { flex: 1, marginLeft: 14 },
  blockBtn: { marginTop: 14 },
  stars: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  thanks: { marginTop: 8 },
  orgTitle: { marginTop: 4 },
});
