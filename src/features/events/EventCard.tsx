import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Clock, MapPin } from 'lucide-react-native';

import { Badge, Button, PatternArt, PressableScale, Text } from '../../components/ui';
import type { BadgeTone } from '../../components/ui';
import { PALETTE, categoryColor, useTheme } from '../../theme';
import type { CampusEvent } from '../../types/domain';
import { seatsLeft } from '../../types/domain';
import { dayNumber, eventPhase, monthShort, timeLabel, weekdayShort } from '../../utils/eventTime';
import { categoryArt } from './eventArt';
import { useRsvpState } from './useRsvpState';

/** Big editorial date: the numeral is the hero of the poster. */
function DateBlock({ event, color }: { event: CampusEvent; color: string }) {
  return (
    <View>
      <Text variant="numeral" color={color}>
        {dayNumber(event.startsAt)}
      </Text>
      <Text variant="overline" color={color} style={styles.month}>
        {monthShort(event.startsAt)} · {weekdayShort(event.startsAt).toUpperCase()}
      </Text>
    </View>
  );
}

/** The one badge that matters most for this student and this event. */
function statusBadge(event: CampusEvent, status: string | undefined): { label: string; tone: BadgeTone } | null {
  const phase = eventPhase(event);
  if (status === 'going') {
    return { label: 'You are going', tone: 'primary' };
  }
  if (status === 'waitlist') {
    return { label: 'Waitlist', tone: 'yellow' };
  }
  if (phase === 'live') {
    return { label: 'Live now', tone: 'coral' };
  }
  if (phase === 'upcoming' && seatsLeft(event) === 0) {
    return { label: 'Full', tone: 'neutral' };
  }
  if (phase === 'ended') {
    return { label: 'Ended', tone: 'neutral' };
  }
  return null;
}

/** Dark, premium feature card. One per screen at most. */
export function FeaturedEventCard({ event }: { event: CampusEvent }) {
  const { colors, radius } = useTheme();
  const { rsvp, label, act, open } = useRsvpState(event);
  const accent = categoryColor(colors, event.category);
  const phase = eventPhase(event);
  const [busy, setBusy] = React.useState(false);

  return (
    <PressableScale
      onPress={open}
      scaleTo={0.99}
      accessibilityRole="button"
      style={[styles.featured, { backgroundColor: colors.inverse, borderRadius: radius.xxl }]}>
      <PatternArt
        kind={categoryArt(colors, event.category).kind}
        bg={colors.inverse}
        fg={accent}
        style={styles.featuredArt}>
        <View style={styles.featuredArtContent}>
          <View style={styles.featuredTop}>
            <Text variant="overline" color={colors.primary}>
              {phase === 'live' ? 'HAPPENING NOW' : 'FEATURED'} · {event.category.toUpperCase()}
            </Text>
          </View>
          <DateBlock event={event} color={colors.onInverse} />
        </View>
      </PatternArt>
      <View style={styles.featuredBody}>
        <Text variant="title1" color={colors.onInverse} style={styles.featuredTitle}>
          {event.title}
        </Text>
        <Text variant="body" color="rgba(247,246,240,0.72)" numberOfLines={2}>
          {event.blurb}
        </Text>
        <View style={styles.metaRow}>
          <Clock size={14} color="rgba(247,246,240,0.7)" />
          <Text variant="small" color="rgba(247,246,240,0.72)" style={styles.metaText}>
            {timeLabel(event.startsAt)}
          </Text>
          <MapPin size={14} color="rgba(247,246,240,0.7)" style={styles.metaGap} />
          <Text variant="small" color="rgba(247,246,240,0.72)" style={styles.metaText} numberOfLines={1}>
            {event.venue}
          </Text>
        </View>
        <View style={styles.featuredFoot}>
          <Text variant="smallStrong" color={colors.onInverse}>
            {event.goingCount} going
          </Text>
          <Button
            title={label}
            size="md"
            fullWidth={false}
            loading={busy}
            variant={rsvp?.status === 'going' || label === 'On waitlist' ? 'soft' : 'primary'}
            onPress={async () => {
              setBusy(true);
              await act();
              setBusy(false);
            }}
          />
        </View>
      </View>
    </PressableScale>
  );
}

/** Card for horizontal rails. */
export function EventRailCard({ event }: { event: CampusEvent }) {
  const { colors, radius } = useTheme();
  const rsvp = useRsvpState(event);
  const art = categoryArt(colors, event.category);
  const badge = statusBadge(event, rsvp.rsvp?.status);
  return (
    <PressableScale
      onPress={rsvp.open}
      scaleTo={0.99}
      accessibilityRole="button"
      style={[
        styles.rail,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl },
      ]}>
      <PatternArt kind={art.kind} bg={art.bg} fg={art.fg} style={styles.railArt}>
        <View style={styles.railArtContent}>
          <DateBlock event={event} color={PALETTE.ink} />
          {badge ? (
            <View style={styles.railBadge}>
              <Badge label={badge.label} tone={badge.tone === 'primary' ? 'ink' : badge.tone} />
            </View>
          ) : null}
        </View>
      </PatternArt>
      <View style={styles.railBody}>
        <Text variant="cardTitle" numberOfLines={2}>
          {event.title}
        </Text>
        <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.railMeta}>
          {timeLabel(event.startsAt)} · {event.venue}
        </Text>
      </View>
    </PressableScale>
  );
}

/** Compact row for long lists. */
export function EventRow({ event, last }: { event: CampusEvent; last?: boolean }) {
  const { colors, radius } = useTheme();
  const rsvp = useRsvpState(event);
  const art = categoryArt(colors, event.category);
  const badge = statusBadge(event, rsvp.rsvp?.status);
  return (
    <PressableScale
      onPress={rsvp.open}
      scaleTo={0.99}
      accessibilityRole="button"
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}>
      <PatternArt kind={art.kind} bg={art.bg} fg={art.fg} style={[styles.rowArt, { borderRadius: radius.lg }]}>
        <View style={styles.rowArtContent}>
          <Text variant="title2" color={PALETTE.ink} style={styles.rowDay}>
            {dayNumber(event.startsAt)}
          </Text>
          <Text variant="overline" color={PALETTE.ink} style={styles.rowMonth}>
            {monthShort(event.startsAt)}
          </Text>
        </View>
      </PatternArt>
      <View style={styles.rowBody}>
        <View style={styles.rowBadges}>
          <Badge label={event.category} tone={art.tone} />
          {badge ? <Badge label={badge.label} tone={badge.tone} /> : null}
        </View>
        <Text variant="cardTitle" numberOfLines={1} style={styles.rowTitle}>
          {event.title}
        </Text>
        <Text variant="small" color="textSecondary" numberOfLines={1}>
          {timeLabel(event.startsAt)} · {event.venue}
        </Text>
      </View>
      <Text variant="smallStrong" color="textSecondary">
        {event.goingCount}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  month: { marginTop: 2 },

  featured: { overflow: 'hidden' },
  featuredArt: { height: 168 },
  featuredArtContent: { flex: 1, padding: 20, justifyContent: 'space-between' },
  featuredTop: { flexDirection: 'row' },
  featuredBody: { padding: 20, paddingTop: 16 },
  featuredTitle: { marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  metaText: { marginLeft: 6, flexShrink: 1 },
  metaGap: { marginLeft: 16 },
  featuredFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },

  rail: { width: 252, borderWidth: 1, overflow: 'hidden', marginRight: 14 },
  railArt: { height: 132 },
  railArtContent: { flex: 1, padding: 16 },
  railBadge: { position: 'absolute', top: 14, right: 14 },
  railBody: { padding: 14 },
  railMeta: { marginTop: 4 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowArt: { width: 72, height: 72 },
  rowArtContent: { flex: 1, padding: 10, justifyContent: 'flex-end' },
  rowDay: { lineHeight: 24 },
  rowMonth: { fontSize: 10, lineHeight: 12 },
  rowBody: { flex: 1, marginLeft: 14, marginRight: 8 },
  rowBadges: { flexDirection: 'row', gap: 6 },
  rowTitle: { marginTop: 6, marginBottom: 2 },
});
