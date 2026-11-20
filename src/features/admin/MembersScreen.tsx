import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, UserCheck, X } from 'lucide-react-native';

import { Avatar, Button, Card, Chip, EmptyState, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { ROLE_LABEL } from '../../types/domain';
import type { AdminMember, MemberStatus } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'Members'>;

const FILTERS: { status: MemberStatus; label: string }[] = [
  { status: 'pending', label: 'Waiting' },
  { status: 'active', label: 'Approved' },
  { status: 'rejected', label: 'Rejected' },
];

/** Admin: the students who asked to join this university, and the decision for each. */
export function MembersScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<MemberStatus>('pending');
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await backend.admin.listMembers(filter));
    } catch (e) {
      useToast.getState().show({ title: 'Could not load members', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (m: AdminMember, status: MemberStatus) => {
    if (status === 'rejected' && !(await confirm({ title: `Reject ${m.name}?`, message: 'They will not be able to use CampusHub at your university unless they send a new request.', confirmLabel: 'Reject' }))) {
      return;
    }
    setBusyId(m.uid);
    try {
      await backend.admin.decide(m.uid, { status });
      setMembers(list => list.filter(x => x.uid !== m.uid));
      useToast.getState().show({ title: status === 'active' ? 'Approved' : 'Rejected', body: m.name, tone: 'success' });
    } catch (e) {
      useToast.getState().show({ title: 'Could not save', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Members" onBack={() => navigation.goBack()} />
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <Chip key={f.status} label={f.label} selected={filter === f.status} onPress={() => setFilter(f.status)} />
        ))}
      </View>
      <FlatList
        data={members}
        keyExtractor={m => m.uid}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <EmptyState
            icon={UserCheck}
            title={loading ? 'Loading…' : filter === 'pending' ? 'Nobody is waiting' : 'Nothing here'}
            message={filter === 'pending' ? 'New join requests will appear here.' : 'No students with this status.'}
          />
        }
        renderItem={({ item }) => (
          <Card padding={16}>
            <View style={styles.head}>
              <Avatar name={item.name} uri={item.photoUrl} size={44} />
              <View style={styles.headText}>
                <Text variant="cardTitle" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text variant="small" color="textSecondary" numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            </View>
            <Text variant="small" color="textSecondary" style={styles.meta}>
              {item.studentId} · {item.department} · Batch {item.batch} · {ROLE_LABEL[item.role]} · {timeAgo(item.createdAt)}
            </Text>
            <View style={styles.buttons}>
              {filter !== 'rejected' ? (
                <View style={styles.flex}>
                  <Button
                    title="Reject"
                    variant="danger"
                    size="md"
                    icon={X}
                    disabled={busyId === item.uid}
                    onPress={() => decide(item, 'rejected')}
                  />
                </View>
              ) : null}
              {filter !== 'active' ? (
                <View style={styles.flex}>
                  <Button
                    title="Approve"
                    size="md"
                    icon={Check}
                    disabled={busyId === item.uid}
                    onPress={() => decide(item, 'active')}
                  />
                </View>
              ) : null}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: GUTTER, paddingTop: 12 },
  list: { paddingHorizontal: GUTTER, paddingTop: 16, flexGrow: 1 },
  sep: { height: 12 },
  head: { flexDirection: 'row', alignItems: 'center' },
  headText: { flex: 1, marginLeft: 12 },
  meta: { marginTop: 10 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flex: { flex: 1 },
});
