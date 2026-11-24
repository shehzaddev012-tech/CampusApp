import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Briefcase, CalendarPlus, Flag, Megaphone, ScanLine, ShieldCheck, UserCheck, Users, UsersRound } from 'lucide-react-native';

import { Card, ListRow, PressableScale, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { GUTTER, useTheme } from '../../theme';
import type { AdminStats } from '../../types/domain';
import { dateLabel } from '../../utils/eventTime';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminHome'>;

/** The admin's own corner of the app: the numbers, and every tool the admin needs. No separate website. */
export function AdminHomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [s, setS] = useState<AdminStats | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    return backend.admin
      .stats()
      .then(setS)
      .catch(() => setFailed(true));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const turnout = s && s.events.ticketsLast30Days ? Math.round((s.events.checkedInLast30Days / s.events.ticketsLast30Days) * 100) : null;
  const maxDept = Math.max(1, ...(s?.membersByDepartment.map(d => d.count) ?? [1]));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Admin" onBack={() => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {/* The numbers */}
        {failed ? (
          <Text variant="body" color="textSecondary">
            Could not load the numbers. Pull down to try again.
          </Text>
        ) : !s ? (
          <Skeleton height={180} radius={20} />
        ) : (
          <>
            <View style={styles.grid}>
              <Stat n={s.members.active} label="Active members" />
              <Stat n={s.members.suspended} label="Suspended" alert={s.members.suspended > 0} onPress={() => navigation.navigate('Members')} />
              <Stat n={s.members.joinedLast30Days} label="Joined in 30 days" />
              <Stat n={s.content.openReports} label="Open reports" alert={s.content.openReports > 0} onPress={() => navigation.navigate('Reports')} />
              <Stat n={s.events.upcoming} label="Upcoming events" />
              <Stat n={turnout === null ? '-' : `${turnout}%`} label="Turnout, 30 days" />
              <Stat n={s.content.postsLast30Days} label="Notices, 30 days" />
              <Stat n={s.content.messagesLast7Days} label="Messages this week" />
            </View>
          </>
        )}

        {/* Tools */}
        <Text variant="cardTitle" style={styles.section}>
          Tools
        </Text>
        <Card padding={4}>
          <ListRow icon={Megaphone} title="Publish a notice" subtitle="Official updates and safety alerts" onPress={() => navigation.navigate('Composer')} />
          <ListRow icon={CalendarPlus} title="New event" onPress={() => navigation.navigate('EventComposer')} />
          <ListRow icon={UserCheck} title="Guest requests" subtitle="Approve or decline guest passes" onPress={() => navigation.navigate('GuestApprovals')} />
          <ListRow icon={ScanLine} title="Gate scanner" subtitle="Tickets, guest passes and student cards" onPress={() => navigation.navigate('Scanner')} />
          <ListRow icon={Users} title="Members" subtitle="Roles and suspending" onPress={() => navigation.navigate('Members')} />
          <ListRow icon={Flag} title="Reports" subtitle="What students reported" onPress={() => navigation.navigate('Reports')} />
          <ListRow icon={UsersRound} title="New society" subtitle="Heads are chosen on the society's page" onPress={() => navigation.navigate('SocietyForm')} />
          <ListRow icon={Briefcase} title="Jobs" subtitle="Close or remove listings" onPress={() => navigation.navigate('Jobs')} last />
        </Card>

        {s ? (
          <>
            <Text variant="cardTitle" style={styles.section}>
              Recent events
            </Text>
            {s.recentEvents.length === 0 ? (
              <Text variant="small" color="textTertiary">
                No events yet.
              </Text>
            ) : (
              <Card padding={4}>
                {s.recentEvents.map((e, i) => (
                  <ListRow
                    key={e.id}
                    icon={ShieldCheck}
                    title={e.title}
                    subtitle={`${dateLabel(e.startsAt)} · ${e.going}${e.capacity ? ` of ${e.capacity}` : ''} tickets · ${e.checkedIn} came`}
                    onPress={() => navigation.navigate('EventDetail', { eventId: e.id })}
                    last={i === s.recentEvents.length - 1}
                  />
                ))}
              </Card>
            )}

            <Text variant="cardTitle" style={styles.section}>
              Members by school
            </Text>
            <Card padding={16}>
              {s.membersByDepartment.length === 0 ? (
                <Text variant="small" color="textTertiary">
                  No members yet.
                </Text>
              ) : (
                s.membersByDepartment.map(d => (
                  <View key={d.department} style={styles.barRow}>
                    <View style={styles.barHead}>
                      <Text variant="small" numberOfLines={1} style={styles.barName}>
                        {d.department}
                      </Text>
                      <Text variant="smallStrong">{d.count}</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: colors.border }]}>
                      <View style={[styles.fill, { backgroundColor: colors.text, width: `${(d.count / maxDept) * 100}%` }]} />
                    </View>
                  </View>
                ))
              )}
            </Card>

            <Text variant="cardTitle" style={styles.section}>
              Campus activity
            </Text>
            <Card padding={16}>
              <Line label="Notes shared" n={s.content.notes} />
              <Line label="Books for sale" n={s.content.booksForSale} />
              <Line label="Open study groups" n={s.content.openStudyGroups} />
              <Line label="Photos in albums" n={s.content.photos} />
              <Line label="Open lost & found posts" n={s.content.openLostFound} />
              <Line label="Open job listings" n={s.content.openJobs} />
            </Card>

            {s.topSocieties.length > 0 ? (
              <>
                <Text variant="cardTitle" style={styles.section}>
                  Biggest societies
                </Text>
                <Card padding={16}>
                  {s.topSocieties.map(t => (
                    <Line key={t.name} label={t.name} n={t.members} />
                  ))}
                </Card>
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ n, label, alert, onPress }: { n: number | string; label: string; alert?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  const body = (
    <Card padding={14} tone={alert ? 'sage' : undefined}>
      <Text variant="title1" style={alert ? { color: colors.danger } : undefined}>
        {n}
      </Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </Card>
  );
  return (
    <View style={styles.cell}>
      {onPress ? (
        <PressableScale onPress={onPress} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${n} ${label}`}>
          {body}
        </PressableScale>
      ) : (
        body
      )}
    </View>
  );
}

function Line({ label, n }: { label: string; n: number }) {
  return (
    <View style={styles.line}>
      <Text variant="body" style={styles.lineLabel}>
        {label}
      </Text>
      <Text variant="bodyStrong">{n}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '50%', padding: 5 },
  section: { marginTop: 28, marginBottom: 10 },
  barRow: { marginBottom: 14 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barName: { flex: 1, marginRight: 10 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  lineLabel: { flex: 1, marginRight: 10 },
});
