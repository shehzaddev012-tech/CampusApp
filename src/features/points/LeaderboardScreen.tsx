import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Trophy } from 'lucide-react-native';

import { Avatar, Chip, EmptyState, SegmentedControl, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { usePoints } from '../../store/pointsStore';
import { GUTTER, PALETTE, categoryColor, useTheme } from '../../theme';
import type { BoardEntry, BoardPeriod, BoardScope, Leaderboard } from '../../types/domain';

type Props = NativeStackScreenProps<AppStackParamList, 'Leaderboard'>;

const PERIODS: { value: BoardPeriod; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

const UNIT: Record<BoardScope, string> = { students: 'pts', departments: 'pts / student', societies: 'events' };
const EMPTY: Record<BoardScope, string> = {
  students: 'Nobody has earned points in this period yet. Be the first!',
  departments: 'No department has earned points in this period yet.',
  societies: 'No society has finished an event in this period yet.',
};

export function LeaderboardScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const visible = usePoints(s => s.summary?.leaderboardVisible);
  const [scope, setScope] = useState<BoardScope>('students');
  const [period, setPeriod] = useState<BoardPeriod>('week');
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setBoard(await backend.points.leaderboard(scope, period));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [scope, period]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Leaderboard" onBack={() => navigation.goBack()} />
      <View style={styles.controls}>
        <SegmentedControl<BoardScope>
          value={scope}
          onChange={v => {
            setBoard(null);
            setScope(v);
          }}
          options={[
            { value: 'students', label: 'Students' },
            { value: 'departments', label: 'Departments' },
            { value: 'societies', label: 'Societies' },
          ]}
        />
        <View style={styles.periods}>
          {PERIODS.map(p => (
            <Chip
              key={p.value}
              label={p.label}
              selected={period === p.value}
              onPress={() => {
                setBoard(null);
                setPeriod(p.value);
              }}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={board?.entries ?? []}
        keyExtractor={e => e.uid}
        showsVerticalScrollIndicator={false}
        refreshing={loading && !!board}
        onRefresh={load}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
        ListEmptyComponent={
          loading || !board ? (
            <View style={styles.skeletons}>
              {[0, 1, 2, 3, 4].map(i => (
                <Skeleton key={i} height={64} radius={18} style={styles.skel} />
              ))}
            </View>
          ) : failed ? (
            <EmptyState icon={Trophy} title="Could not load" message="Check your connection and pull down to try again." />
          ) : (
            <EmptyState icon={Trophy} title="Nothing yet" message={EMPTY[scope]} />
          )
        }
        renderItem={({ item }) => <Row entry={item} unit={UNIT[scope]} showAvatar={scope === 'students'} />}
      />

      {scope === 'students' && board ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Text variant="bodyStrong" align="center">
            {visible === false ? 'You are hidden from the board' : board.myRank ? `Your rank: #${board.myRank}` : 'Earn points to appear here'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Row({ entry, unit, showAvatar }: { entry: BoardEntry; unit: string; showAvatar: boolean }) {
  const { colors } = useTheme();
  const medal = entry.rank === 1 ? '#F5C84B' : entry.rank === 2 ? '#C9CFD2' : entry.rank === 3 ? '#D9A47A' : null;
  return (
    <View
      accessible
      accessibilityLabel={`Number ${entry.rank}, ${entry.name}, ${entry.score} ${unit}${entry.me ? ', this is you' : ''}`}
      style={[styles.row, { backgroundColor: entry.me ? colors.accentSoft : colors.surface, borderColor: entry.me ? colors.primary : colors.border }]}>
      <View style={[styles.rank, { backgroundColor: medal ?? colors.surfaceAlt }]}>
        <Text variant="smallStrong" color={medal ? PALETTE.ink : 'textSecondary'}>
          {entry.rank}
        </Text>
      </View>
      {showAvatar ? <Avatar name={entry.name} uri={entry.photoUrl} size={40} /> : <Avatar name={entry.name} size={40} square tint={entry.category ? categoryColor(colors, entry.category) : undefined} />}
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {entry.name}
          {entry.me && showAvatar ? ' (you)' : ''}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {entry.subtitle}
        </Text>
      </View>
      <View style={styles.score}>
        <Text variant="title3">{entry.score}</Text>
        <Text variant="caption" color="textTertiary">
          {unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  controls: { paddingHorizontal: GUTTER, paddingTop: 14, gap: 12 },
  periods: { flexDirection: 'row', gap: 8 },
  list: { paddingHorizontal: GUTTER, paddingTop: 14, gap: 8, flexGrow: 1 },
  skeletons: { gap: 8 },
  skel: { marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 12 },
  rank: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  text: { flex: 1, marginLeft: 12, marginRight: 8 },
  score: { alignItems: 'flex-end' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 14, paddingHorizontal: GUTTER, borderTopWidth: StyleSheet.hairlineWidth },
});
