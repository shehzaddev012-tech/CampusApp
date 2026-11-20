import React from 'react';
import { ScrollView, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Award,
  CalendarCheck,
  Camera,
  Compass,
  Flame,
  Footprints,
  Gift,
  HeartHandshake,
  Lock,
  MessageSquareHeart,
  Star,
  Trophy,
  Users,
} from 'lucide-react-native';

import { Button, Card, SectionHeader, Skeleton, Text, TopBar } from '../../components/ui';
import type { IconType } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { usePoints } from '../../store/pointsStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, PALETTE, useTheme } from '../../theme';
import type { BadgeProgress } from '../../types/domain';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'Points'>;

/** The icon names come from the server's badge list. */
const BADGE_ICONS: Record<string, IconType> = {
  Footprints,
  Compass,
  CalendarCheck,
  HeartHandshake,
  Users,
  Camera,
  Star,
  MessageSquareHeart,
  Flame,
  Trophy,
};

export function PointsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const me = usePoints(s => s.summary);
  const show = useToast(s => s.show);

  const tile = (width - GUTTER * 2 - 12) / 2;

  const setVisible = async (visible: boolean) => {
    try {
      await backend.points.setVisibility(visible);
    } catch (e) {
      show({ title: 'Could not save', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="My points" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {!me ? (
          <>
            <Skeleton height={230} radius={28} />
            <Skeleton height={20} width="50%" style={styles.skel} />
          </>
        ) : (
          <>
            {/* Level and balance */}
            <View style={[styles.hero, { backgroundColor: PALETTE.ink }]}>
              <Text variant="overline" color={PALETTE.green}>
                LEVEL {me.level.index + 1} · {me.level.name.toUpperCase()}
              </Text>
              <View style={styles.balanceRow}>
                <Text variant="numeral" color={PALETTE.paper}>
                  {me.balance}
                </Text>
                <Text variant="bodyStrong" color="rgba(247,246,240,0.7)" style={styles.balanceLabel}>
                  points to spend
                </Text>
              </View>
              {me.level.next ? (
                <>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${Math.min(100, Math.round(((me.earned - me.level.min) / (me.level.next.min - me.level.min)) * 100))}%`, backgroundColor: PALETTE.green }]} />
                  </View>
                  <Text variant="small" color="rgba(247,246,240,0.7)">
                    {me.level.next.min - me.earned} more points to {me.level.next.name}
                  </Text>
                </>
              ) : (
                <Text variant="small" color="rgba(247,246,240,0.7)">
                  You reached the top level. Legend!
                </Text>
              )}
              <View style={styles.heroStats}>
                <Stat value={me.rank.week ? `#${me.rank.week}` : '–'} label="This week" />
                <Stat value={String(me.streakWeeks)} label={me.streakWeeks === 1 ? 'Week streak' : 'Weeks streak'} />
                <Stat value={String(me.stats.events)} label="Events" />
              </View>
            </View>

            <View style={styles.buttons}>
              <View style={styles.flex}>
                <Button title="Leaderboard" variant="soft" size="md" icon={Trophy} onPress={() => navigation.navigate('Leaderboard')} />
              </View>
              <View style={styles.flex}>
                <Button title="Rewards" size="md" icon={Gift} onPress={() => navigation.navigate('Rewards')} />
              </View>
            </View>

            {/* Badges */}
            <View style={styles.block}>
              <SectionHeader eyebrow={`${me.badges.filter(b => b.earned).length} of ${me.badges.length}`} title="Badges" />
              <View style={styles.grid}>
                {me.badges.map(b => (
                  <BadgeTile key={b.id} badge={b} width={tile} />
                ))}
              </View>
            </View>

            {/* Recent activity */}
            <View style={styles.block}>
              <SectionHeader title="How you earned" />
              {me.recent.length === 0 ? (
                <Text variant="body" color="textSecondary">
                  Go to an event, join a society or add a photo to start earning points.
                </Text>
              ) : (
                me.recent.map((r, i) => (
                  <View key={r.id} style={[styles.row, i < me.recent.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <View style={styles.rowText}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {r.label}
                      </Text>
                      <Text variant="caption" color="textTertiary">
                        {timeAgo(r.createdAt)}
                      </Text>
                    </View>
                    <Text variant="bodyStrong" color={r.points > 0 ? 'success' : 'textSecondary'}>
                      {r.points > 0 ? '+' : ''}
                      {r.points}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <Card padding={16} style={styles.block}>
              <View style={styles.privacy}>
                <View style={styles.rowText}>
                  <Text variant="bodyStrong">Show me on leaderboards</Text>
                  <Text variant="small" color="textSecondary">
                    When off, others do not see your name. Your points still count for your department.
                  </Text>
                </View>
                <Switch
                  value={me.leaderboardVisible}
                  onValueChange={setVisible}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={me.leaderboardVisible ? '#14231D' : '#FFFFFF'}
                />
              </View>
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="title2" color={PALETTE.paper}>
        {value}
      </Text>
      <Text variant="caption" color="rgba(247,246,240,0.65)">
        {label}
      </Text>
    </View>
  );
}

function BadgeTile({ badge, width }: { badge: BadgeProgress; width: number }) {
  const { colors } = useTheme();
  const Icon = BADGE_ICONS[badge.icon] ?? Award;
  const pct = Math.round((badge.progress.value / badge.progress.goal) * 100);
  return (
    <View
      accessible
      accessibilityLabel={`${badge.title}. ${badge.earned ? 'Earned' : `${badge.progress.value} of ${badge.progress.goal}`}. ${badge.description}`}
      style={[styles.badge, { width, backgroundColor: colors.surface, borderColor: badge.earned ? colors.primary : colors.border }]}>
      <View style={[styles.badgeIcon, { backgroundColor: badge.earned ? colors.primary : colors.surfaceAlt }]}>
        {badge.earned ? <Icon size={22} color={PALETTE.ink} strokeWidth={2.2} /> : <Lock size={18} color={colors.textTertiary} strokeWidth={2.2} />}
      </View>
      <Text variant="cardTitle" numberOfLines={1} style={styles.badgeTitle}>
        {badge.title}
      </Text>
      <Text variant="caption" color="textSecondary" numberOfLines={2} style={styles.badgeDesc}>
        {badge.description}
      </Text>
      {!badge.earned ? (
        <>
          <View style={[styles.badgeTrack, { backgroundColor: colors.surfaceAlt }]}>
            <View style={[styles.badgeFill, { width: `${pct}%`, backgroundColor: colors.text }]} />
          </View>
          <Text variant="caption" color="textTertiary">
            {badge.progress.value} / {badge.progress.goal}
          </Text>
        </>
      ) : (
        <Text variant="caption" color="textTertiary">
          Earned
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
  skel: { marginTop: 16 },
  hero: { borderRadius: 28, padding: 22 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6, marginBottom: 14 },
  balanceLabel: { marginLeft: 10, marginBottom: 10 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(247,246,240,0.18)', overflow: 'hidden', marginBottom: 8 },
  fill: { height: 8, borderRadius: 4 },
  heroStats: { flexDirection: 'row', marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(247,246,240,0.2)' },
  stat: { flex: 1 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  flex: { flex: 1 },
  block: { marginTop: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge: { borderWidth: 1.5, borderRadius: 20, padding: 14 },
  badgeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeTitle: { marginTop: 12 },
  badgeDesc: { marginTop: 2, minHeight: 32 },
  badgeTrack: { height: 5, borderRadius: 3, marginTop: 10, marginBottom: 4, overflow: 'hidden' },
  badgeFill: { height: 5, borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowText: { flex: 1, marginRight: 12 },
  privacy: { flexDirection: 'row', alignItems: 'center' },
});

