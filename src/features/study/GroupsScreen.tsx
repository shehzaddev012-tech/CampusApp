import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MapPin, Plus, Users } from 'lucide-react-native';

import { Badge, Card, Chip, EmptyState, IconButton, Input, PressableScale, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { GUTTER, useTheme } from '../../theme';
import type { StudyGroup } from '../../types/domain';

type Props = NativeStackScreenProps<AppStackParamList, 'Groups'>;

export function GroupsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<'open' | 'mine'>('open');
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<StudyGroup[] | null>(null);

  const load = useCallback(async () => {
    try {
      setGroups(await backend.study.listGroups({ scope, q: q.trim() || undefined }));
    } catch {
      setGroups(prev => prev ?? []);
    }
  }, [scope, q]);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(load, 250);
      return () => clearTimeout(t);
    }, [load]),
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Study groups" onBack={() => navigation.goBack()} right={<IconButton icon={Plus} onPress={() => navigation.navigate('GroupForm')} accessibilityLabel="Start a group" />} />
      <View style={styles.search}>
        <Input placeholder="Search by name or course" value={q} onChangeText={setQ} returnKeyType="search" />
      </View>
      <View style={styles.filters}>
        <Chip label="Open groups" selected={scope === 'open'} onPress={() => { setGroups(null); setScope('open'); }} />
        <Chip label="My groups" selected={scope === 'mine'} onPress={() => { setGroups(null); setScope('mine'); }} />
      </View>
      <FlatList
        data={groups ?? []}
        keyExtractor={g => g.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          groups === null ? (
            <Skeleton height={110} radius={20} />
          ) : (
            <EmptyState
              icon={Users}
              title={scope === 'open' ? 'No open groups' : 'You are not in any group'}
              message="Study is easier together. Start a group for your next exam and let others join."
              actionLabel="Start a group"
              onAction={() => navigation.navigate('GroupForm')}
            />
          )
        }
        renderItem={({ item: g }) => (
          <PressableScale onPress={() => navigation.navigate('GroupDetail', { groupId: g.id })} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={g.title}>
            <Card padding={16}>
              <View style={styles.head}>
                <Badge label={g.course || 'Study group'} tone="info" />
                {g.joined ? <Badge label={g.mine ? 'You started it' : 'Joined'} tone="success" /> : g.status === 'closed' ? <Badge label="Closed" tone="neutral" /> : g.full ? <Badge label="Full" tone="warning" /> : null}
              </View>
              <Text variant="title3" style={styles.title} numberOfLines={2}>
                {g.title}
              </Text>
              {g.meeting ? (
                <View style={styles.row}>
                  <MapPin size={14} color={colors.textTertiary} />
                  <Text variant="small" color="textSecondary" style={styles.rowText} numberOfLines={1}>
                    {g.meeting}
                  </Text>
                </View>
              ) : null}
              <View style={styles.row}>
                <Users size={14} color={colors.textTertiary} />
                <Text variant="small" color="textSecondary" style={styles.rowText}>
                  {g.memberCount}
                  {g.capacity ? ` of ${g.capacity}` : ''} {g.memberCount === 1 ? 'member' : 'members'} · started by {g.mine ? 'you' : g.createdByName}
                </Text>
              </View>
            </Card>
          </PressableScale>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  search: { paddingHorizontal: GUTTER, paddingTop: 12 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: GUTTER, paddingVertical: 12 },
  list: { paddingHorizontal: GUTTER, paddingTop: 4, flexGrow: 1 },
  sep: { height: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  rowText: { marginLeft: 6, flex: 1 },
});
