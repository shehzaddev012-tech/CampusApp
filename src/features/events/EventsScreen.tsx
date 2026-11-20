import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarX, Plus, ScanLine, Search, Ticket } from 'lucide-react-native';

import {
  Chip,
  EmptyState,
  FadeIn,
  IconButton,
  Input,
  PressableScale,
  Screen,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  Text,
} from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { featuredEvent, upcomingEvents, useEvents } from '../../store/eventStore';
import { useSession } from '../../store/sessionStore';
import { PALETTE, categoryColor, radius, useTheme } from '../../theme';
import { EventCategory, canCreateEvents, canScan } from '../../types/domain';
import { dayKey, dayNumber, weekdayShort } from '../../utils/eventTime';
import { EventRow, FeaturedEventCard } from './EventCard';

const CATEGORIES: ('All' | EventCategory)[] = ['All', 'Tech', 'Sports', 'Cultural', 'Career', 'Social'];

export function EventsScreen() {
  const { colors } = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const role = useSession(s => s.membership?.role);
  const events = useEvents(s => s.events);
  const status = useEvents(s => s.status);
  const rsvps = useEvents(s => s.rsvps);

  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [day, setDay] = useState<string>('all');
  const [query, setQuery] = useState('');

  const upcoming = useMemo(() => upcomingEvents(events), [events]);
  const past = useMemo(
    () => events.filter(e => e.endsAt < Date.now()).sort((a, b) => b.startsAt - a.startsAt).slice(0, 4),
    [events],
  );

  const days = useMemo(() => {
    const seen = new Map<string, number>();
    upcoming.forEach(e => {
      if (!seen.has(dayKey(e.startsAt))) {
        seen.set(dayKey(e.startsAt), e.startsAt);
      }
    });
    return Array.from(seen.entries());
  }, [upcoming]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return upcoming.filter(
      e =>
        (category === 'All' || e.category === category) &&
        (day === 'all' || dayKey(e.startsAt) === day) &&
        (!q || e.title.toLowerCase().includes(q) || e.organizer.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q)),
    );
  }, [upcoming, category, day, query]);

  const featured = featuredEvent(items);
  const rest = items.filter(e => e.id !== featured?.id);
  const ticketCount = Object.values(rsvps).filter(r => r.status === 'going' && !r.checkedInAt).length;

  const headerButtons = (
    <>
      {role && canScan(role) ? (
        <IconButton icon={ScanLine} onPress={() => nav.navigate('Scanner')} accessibilityLabel="Open gate scanner" />
      ) : null}
      <IconButton
        icon={Ticket}
        dot={ticketCount > 0}
        onPress={() => nav.navigate('MyTickets')}
        accessibilityLabel="My tickets"
      />
      {role && canCreateEvents(role) ? (
        <IconButton icon={Plus} onPress={() => nav.navigate('EventComposer')} accessibilityLabel="Create event" />
      ) : null}
    </>
  );

  return (
    <Screen scroll tabScreen>
      <ScreenHeader title="Events" subtitle="What's happening on campus" right={headerButtons} />

      <Input icon={Search} placeholder="Search events, societies, venues" value={query} onChangeText={setQuery} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}>
        {CATEGORIES.map(c => (
          <Chip
            key={c}
            label={c}
            selected={category === c}
            dot={c === 'All' ? undefined : categoryColor(colors, c)}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dates}
        contentContainerStyle={styles.stripContent}>
        <DatePill label="All" sub="dates" active={day === 'all'} onPress={() => setDay('all')} />
        {days.map(([key, ms]) => (
          <DatePill
            key={key}
            label={dayNumber(ms)}
            sub={weekdayShort(ms)}
            active={day === key}
            onPress={() => setDay(key)}
          />
        ))}
      </ScrollView>

      {status === 'loading' ? (
        <Skeleton height={420} radius={28} style={styles.skeleton} />
      ) : featured ? (
        <FadeIn key={featured.id} style={styles.featured}>
          <FeaturedEventCard event={featured} />
        </FadeIn>
      ) : (
        <EmptyState icon={CalendarX} title="No events found" message="Try another category, date or search term." />
      )}

      {rest.length > 0 ? (
        <>
          <SectionHeader eyebrow={`${rest.length} more`} title="Upcoming" />
          <View>
            {rest.map((e, i) => (
              <EventRow key={e.id} event={e} last={i === rest.length - 1} />
            ))}
          </View>
        </>
      ) : null}

      {past.length > 0 && !query && day === 'all' && category === 'All' ? (
        <View style={styles.past}>
          <SectionHeader eyebrow="Recent" title="Past events" />
          {past.map((e, i) => (
            <EventRow key={e.id} event={e} last={i === past.length - 1} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function DatePill({
  label,
  sub,
  active,
  onPress,
}: {
  label: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const bg = active ? (isDark ? colors.primary : PALETTE.ink) : colors.surface;
  const fg = active ? (isDark ? PALETTE.ink : colors.primary) : colors.text;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.datePill,
        { backgroundColor: bg, borderColor: active ? bg : colors.border, borderRadius: radius.lg },
      ]}>
      <Text variant="title3" color={fg}>
        {label}
      </Text>
      <Text variant="caption" color={fg} style={styles.dateSub}>
        {sub}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  strip: { marginHorizontal: -20, marginTop: 16 },
  dates: { marginHorizontal: -20, marginTop: 12 },
  stripContent: { paddingHorizontal: 20, gap: 8 },
  datePill: { width: 58, height: 64, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dateSub: { marginTop: 1, opacity: 0.8 },
  featured: { marginTop: 24, marginBottom: 32 },
  skeleton: { marginTop: 24, marginBottom: 32 },
  past: { marginTop: 32 },
});
