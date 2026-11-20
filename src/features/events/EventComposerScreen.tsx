import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';

import { Button, Card, Chip, EmptyState, Input, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useEvents } from '../../store/eventStore';
import { useSession } from '../../store/sessionStore';
import { manageableSocieties, useSocieties } from '../../store/societyStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, PALETTE, categoryColor, radius, useTheme } from '../../theme';
import { EventCategory, canCreateEvents } from '../../types/domain';
import { DAY, HOUR, dayNumber, timeLabel, weekdayShort } from '../../utils/eventTime';

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

export function EventComposerScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const membership = useSession(s => s.membership);
  const university = useSession(s => s.university);
  const create = useEvents(s => s.createEvent);
  const societies = useSocieties(s => s.societies);
  const show = useToast(s => s.show);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Social');
  const [dayOffset, setDayOffset] = useState(1);
  const [hour, setHour] = useState(16);
  const [duration, setDuration] = useState(2);
  const [venue, setVenue] = useState('');
  const [blurb, setBlurb] = useState('');
  const [capacity, setCapacity] = useState('');
  const [volunteers, setVolunteers] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => startOfDay(i)), []);

  if (!membership || !canCreateEvents(membership.role)) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar close title="New event" onBack={() => navigation.goBack()} />
        <EmptyState icon={Lock} title="You cannot create events" message="Society heads and admins can publish events." />
      </View>
    );
  }

  // A society head organises for one of their societies; admins may organise for a society or as the university.
  const isAdmin = membership.role === 'uni_admin' || membership.role === 'dept_admin';
  const mine = manageableSocieties(societies, isAdmin);
  const society = mine.find(s => s.id === societyId) ?? (!isAdmin && mine.length === 1 ? mine[0] : undefined);
  const organizer =
    society
      ? society.name
      : membership.role === 'society_head'
      ? 'Choose a society'
      : membership.role === 'dept_admin'
      ? `${membership.department} Department`
      : `${university?.name ?? 'University'} Administration`;

  const startsAt = startOfDay(dayOffset) + hour * HOUR;
  const endsAt = startsAt + duration * HOUR;
  const seats = capacity.trim() === '' ? null : parseInt(capacity, 10);
  const capacityOk = seats === null || (Number.isFinite(seats) && seats >= 1 && seats <= 20000);
  const valid = title.trim().length >= 3 && venue.trim().length >= 2 && blurb.trim().length >= 10 && capacityOk && (isAdmin || !!society);

  const publish = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
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
      isPublic,
    });
    setBusy(false);
    if (id) {
      show({ title: 'Event published', body: 'Students can now get tickets.', tone: 'success' });
      navigation.replace('EventDetail', { eventId: id });
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TopBar close title="New event" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text variant="caption" color="textSecondary">
          Publishing as {organizer}
        </Text>
        {mine.length > (isAdmin ? 0 : 1) ? (
          <View style={[styles.chips, styles.societyChips]}>
            {isAdmin ? <Chip label={` Administration`} selected={!society} onPress={() => setSocietyId(null)} /> : null}
            {mine.map(s => (
              <Chip key={s.id} label={s.name} selected={society?.id === s.id} onPress={() => setSocietyId(s.id)} />
            ))}
          </View>
        ) : null}
        {!isAdmin && mine.length === 0 ? (
          <Text variant="small" color="danger" style={styles.societyChips}>
            You do not head a society yet. Ask an admin to make you a head.
          </Text>
        ) : null}

        <View style={styles.field}>
          <Input label="Event name" placeholder="e.g. Spring Music Night" value={title} onChangeText={setTitle} maxLength={80} />
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
          {days.map((ms, i) => {
            const active = dayOffset === i;
            return (
              <PressableScale
                key={ms}
                onPress={() => setDayOffset(i)}
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
                  {i === 0 ? 'Today' : weekdayShort(ms)}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        <Text variant="smallStrong" style={styles.label}>
          Starts at
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.bleedContent}>
          {START_HOURS.map(h => (
            <Chip key={h} label={timeLabel(startOfDay(0) + h * HOUR)} selected={hour === h} onPress={() => setHour(h)} />
          ))}
        </ScrollView>

        <Text variant="smallStrong" style={styles.label}>
          Duration
        </Text>
        <View style={styles.chips}>
          {DURATIONS.map(d => (
            <Chip key={d} label={`${d} h`} selected={duration === d} onPress={() => setDuration(d)} />
          ))}
        </View>
        <Text variant="caption" color="textSecondary" style={styles.summary}>
          {timeLabel(startsAt)} to {timeLabel(endsAt)}
        </Text>

        <View style={styles.field}>
          <Input label="Venue" placeholder="e.g. Main Auditorium" value={venue} onChangeText={setVenue} maxLength={60} />
        </View>
        <View style={styles.field}>
          <Input label="About" placeholder="What happens, who it is for, what to bring." value={blurb} onChangeText={setBlurb} multiline maxLength={600} />
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

        <Text variant="smallStrong" style={styles.label}>
          Volunteers needed
        </Text>
        <View style={styles.chips}>
          {VOLUNTEERS.map(v => (
            <Chip key={v} label={v === 0 ? 'None' : String(v)} selected={volunteers === v} onPress={() => setVolunteers(v)} />
          ))}
        </View>

        <Card padding={14} style={styles.public}>
          <View style={styles.publicRow}>
            <View style={styles.publicText}>
              <Text variant="bodyStrong">Open to other universities</Text>
              <Text variant="small" color="textSecondary">
                Lets students from other campuses discover this event.
              </Text>
            </View>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={isPublic ? '#14231D' : '#FFFFFF'} />
          </View>
        </Card>

        <View style={styles.cta}>
          <Button title="Publish event" onPress={publish} loading={busy} disabled={!valid} />
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
  public: { marginTop: 24 },
  publicRow: { flexDirection: 'row', alignItems: 'center' },
  publicText: { flex: 1, marginRight: 12 },
  cta: { marginTop: 28 },
});
