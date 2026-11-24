import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';

import { Button, Card, Chip, EmptyState, Input, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useEvents } from '../../store/eventStore';
import { useSession } from '../../store/sessionStore';
import { manageableSocieties, useSocieties } from '../../store/societyStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, PALETTE, categoryColor, radius, useTheme } from '../../theme';
import { EventCategory, canCreateEvents } from '../../types/domain';
import { DAY, HOUR, dayNumber, timeLabel, weekdayShort } from '../../utils/eventTime';
import { minHint } from '../../utils/minHint';

type Props = NativeStackScreenProps<AppStackParamList, 'EventComposer'>;

const CATEGORIES: EventCategory[] = ['Tech', 'Sports', 'Cultural', 'Career', 'Social'];
const START_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const DURATIONS = [1, 2, 3, 4, 6];
const VOLUNTEERS = [0, 5, 10, 20];

function startOfDay(offsetDays: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() + offsetDays * DAY;
}

export function EventComposerScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const membership = useSession(s => s.membership);
  const university = useSession(s => s.university);
  const create = useEvents(s => s.createEvent);
  const editing = useEvents(s => s.events.find(e => e.id === route.params?.eventId));
  const isEdit = !!route.params?.eventId;
  const societies = useSocieties(s => s.societies);
  const show = useToast(s => s.show);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Social');
  const first = editing ? new Date(editing.startsAt) : null;
  const [dayStart, setDayStart] = useState(first ? new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime() : startOfDay(1));
  const [hour, setHour] = useState(first ? first.getHours() : 16);
  const [duration, setDuration] = useState(editing ? Math.max(1, Math.round((editing.endsAt - editing.startsAt) / HOUR)) : 2);
  const [venue, setVenue] = useState('');
  const [blurb, setBlurb] = useState('');
  const [capacity, setCapacity] = useState('');
  const [volunteers, setVolunteers] = useState(0);
  const [busy, setBusy] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);

  // The next two weeks, plus the event's own day when it is older than that.
  const days = useMemo(() => {
    const list = Array.from({ length: 14 }, (_, i) => startOfDay(i));
    return list.includes(dayStart) ? list : [dayStart, ...list].sort((a, b) => a - b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const hours = START_HOURS.includes(hour) ? START_HOURS : [...START_HOURS, hour].sort((a, b) => a - b);
  const durations = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b);

  // Fill the form once, with the event being changed.
  const filled = useRef(false);
  useEffect(() => {
    if (editing && !filled.current) {
      filled.current = true;
      setTitle(editing.title);
      setCategory(editing.category);
      setVenue(editing.venue);
      setBlurb(editing.blurb);
      setCapacity(editing.capacity === null ? '' : String(editing.capacity));
    }
  }, [editing]);

  if (!membership || !canCreateEvents(membership.role)) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar close title="New event" onBack={() => navigation.goBack()} />
        <EmptyState icon={Lock} title="You cannot create events" message="Society heads and admins can publish events." />
      </View>
    );
  }

  // A society head organises for one of their societies; admins may organise for a society or as the university.
  const isAdmin = membership.role === 'uni_admin';
  const mine = manageableSocieties(societies, isAdmin);
  const society = mine.find(s => s.id === societyId) ?? (!isAdmin && mine.length === 1 ? mine[0] : undefined);
  const organizer =
    society
      ? society.name
      : membership.role === 'society_head'
      ? 'Choose a society'
      : `${university?.name ?? 'University'} Administration`;

  const startsAt = dayStart + hour * HOUR;
  const endsAt = startsAt + duration * HOUR;
  const seats = capacity.trim() === '' ? null : parseInt(capacity, 10);
  const capacityOk = seats === null || (Number.isFinite(seats) && seats >= 1 && seats <= 20000);
  const valid = title.trim().length >= 3 && venue.trim().length >= 2 && blurb.trim().length >= 10 && capacityOk && (isEdit || isAdmin || !!society);

  const publish = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    if (isEdit && route.params?.eventId) {
      try {
        await backend.events.update(route.params.eventId, { title: title.trim(), blurb: blurb.trim(), venue: venue.trim(), category, startsAt, endsAt, capacity: seats });
        show({ title: 'Event updated', tone: 'success' });
        navigation.goBack();
      } catch (e) {
        show({ title: 'Could not save', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
      } finally {
        setBusy(false);
      }
      return;
    }
    const id = await create({
      title: title.trim(),
      organizer: society ? undefined : organizer,
      societyId: society?.id ?? null,
      category,
      blurb: blurb.trim(),
      venue: venue.trim(),
      startsAt,
      endsAt,
      capacity: seats,
      volunteersNeeded: volunteers,
      isPublic: false,
    });
    setBusy(false);
    if (id) {
      show({ title: 'Event published', body: 'Students can now get tickets.', tone: 'success' });
      navigation.replace('EventDetail', { eventId: id });
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TopBar close title={isEdit ? 'Edit event' : 'New event'} onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {isEdit ? null : (
          <Text variant="caption" color="textSecondary">
            Publishing as {organizer}
          </Text>
        )}
        {!isEdit && mine.length > (isAdmin ? 0 : 1) ? (
          <View style={[styles.chips, styles.societyChips]}>
            {isAdmin ? <Chip label={` Administration`} selected={!society} onPress={() => setSocietyId(null)} /> : null}
            {mine.map(s => (
              <Chip key={s.id} label={s.name} selected={society?.id === s.id} onPress={() => setSocietyId(s.id)} />
            ))}
          </View>
        ) : null}
        {!isEdit && !isAdmin && mine.length === 0 ? (
          <Text variant="small" color="danger" style={styles.societyChips}>
            You do not head a society yet. Ask an admin to make you a head.
          </Text>
        ) : null}

        <View style={styles.field}>
          <Input label="Event name" placeholder="e.g. Spring Music Night" value={title} onChangeText={setTitle} maxLength={80} hint={minHint(title, 3)} />
        </View>

        <Text variant="smallStrong" style={styles.label}>
          Category
        </Text>
        <View style={styles.chips}>
          {CATEGORIES.map(c => (
            <Chip key={c} label={c} dot={categoryColor(colors, c)} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <Text variant="smallStrong" style={styles.label}>
          Date
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.bleedContent}>
          {days.map(ms => {
            const active = dayStart === ms;
            return (
              <PressableScale
                key={ms}
                onPress={() => setDayStart(ms)}
                scaleTo={0.95}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.dayPill,
                  { backgroundColor: active ? PALETTE.ink : colors.surface, borderColor: active ? PALETTE.ink : colors.border },
                ]}>
                <Text variant="title3" color={active ? PALETTE.green : 'text'}>
                  {dayNumber(ms)}
                </Text>
                <Text variant="caption" color={active ? PALETTE.green : 'textSecondary'}>
                  {ms === startOfDay(0) ? 'Today' : weekdayShort(ms)}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        <Text variant="smallStrong" style={styles.label}>
          Starts at
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.bleedContent}>
          {hours.map(h => (
            <Chip key={h} label={timeLabel(startOfDay(0) + h * HOUR)} selected={hour === h} onPress={() => setHour(h)} />
          ))}
        </ScrollView>

        <Text variant="smallStrong" style={styles.label}>
          Duration
        </Text>
        <View style={styles.chips}>
          {durations.map(d => (
            <Chip key={d} label={`${d} h`} selected={duration === d} onPress={() => setDuration(d)} />
          ))}
        </View>
        <Text variant="caption" color="textSecondary" style={styles.summary}>
          {timeLabel(startsAt)} to {timeLabel(endsAt)}
        </Text>

        <View style={styles.field}>
          <Input label="Venue" placeholder="e.g. Main Auditorium" value={venue} onChangeText={setVenue} maxLength={60} hint={minHint(venue, 2)} />
        </View>
        <View style={styles.field}>
          <Input label="About" placeholder="What happens, who it is for, what to bring." value={blurb} onChangeText={setBlurb} multiline maxLength={600} hint={minHint(blurb, 10, 600)} />
        </View>
        <View style={styles.field}>
          <Input
            label="Seats (leave empty for unlimited)"
            placeholder="e.g. 150"
            keyboardType="number-pad"
            value={capacity}
            onChangeText={t => setCapacity(t.replace(/\D/g, ''))}
            error={!capacityOk ? 'Enter a number between 1 and 20000' : null}
          />
        </View>

        {isEdit ? null : (
          <>
            <Text variant="smallStrong" style={styles.label}>
              Volunteers needed
            </Text>
            <View style={styles.chips}>
              {VOLUNTEERS.map(v => (
                <Chip key={v} label={v === 0 ? 'None' : String(v)} selected={volunteers === v} onPress={() => setVolunteers(v)} />
              ))}
            </View>
          </>
        )}



        <View style={styles.cta}>
          <Button title={isEdit ? 'Save changes' : 'Publish event'} onPress={publish} loading={busy} disabled={!valid} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 18 },
  field: { marginTop: 20 },
  label: { marginTop: 22, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  societyChips: { marginTop: 12 },
  bleed: { marginHorizontal: -GUTTER },
  bleedContent: { paddingHorizontal: GUTTER, gap: 8 },
  dayPill: { width: 58, height: 64, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { marginTop: 10 },
  cta: { marginTop: 28 },
});
