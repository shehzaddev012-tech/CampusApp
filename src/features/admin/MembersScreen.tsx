import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search, UserCheck } from 'lucide-react-native';

import { Avatar, Badge, Button, Card, Chip, EmptyState, Input, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useSession } from '../../store/sessionStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { ROLE_LABEL } from '../../types/domain';
import type { AdminMember, MemberStatus, Role } from '../../types/domain';
import { confirm } from '../../utils/confirm';

type Props = NativeStackScreenProps<AppStackParamList, 'Members'>;

type Filter = 'active' | 'suspended';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
];
const ROLES: Role[] = ['student', 'society_head', 'security', 'uni_admin'];

/** Admin: everyone at IAC. Change someone's role, or suspend a person who should not be here. */
export function MembersScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useSession(s => s.membership?.uid);
  const [filter, setFilter] = useState<Filter>('active');
  const [q, setQ] = useState('');
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

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter(m => !needle || [m.name, m.email, m.studentId, m.department].some(v => v.toLowerCase().includes(needle)));
  }, [members, q]);

  const change = async (m: AdminMember, patch: { status?: MemberStatus; role?: Role }, ask?: { title: string; message?: string; confirmLabel: string }, done?: string) => {
    if (ask && !(await confirm(ask))) {
      return;
    }
    setBusyId(m.uid);
    try {
      const updated = await backend.admin.decide(m.uid, patch);
      setMembers(list => (patch.status ? list.filter(x => x.uid !== m.uid) : list.map(x => (x.uid === m.uid ? updated : x))));
      useToast.getState().show({ title: done ?? 'Saved', body: m.name, tone: 'success' });
    } catch (e) {
      useToast.getState().show({ title: 'Could not save', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Members" onBack={() => navigation.goBack()} />
      <View style={styles.top}>
        <Input placeholder="Search name, email or student ID" value={q} onChangeText={setQ} icon={Search} autoCapitalize="none" />
        <View style={styles.filters}>
          {FILTERS.map(f => (
            <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
          ))}
        </View>
      </View>
      <FlatList
        data={shown}
        keyExtractor={m => m.uid}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={<EmptyState icon={UserCheck} title={loading ? 'Loading…' : 'Nobody here'} message={filter === 'suspended' ? 'Nobody is suspended.' : 'No members match.'} />}
        renderItem={({ item }) => {
          const mine = item.uid === me;
          return (
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
                {filter === 'suspended' ? <Badge label="Suspended" tone="neutral" /> : null}
              </View>
              <Text variant="small" color="textSecondary" style={styles.meta}>
                {item.studentId} · {item.department}
              </Text>

              {filter === 'active' ? (
                <>
                  <Text variant="smallStrong" style={styles.label}>
                    Role
                  </Text>
                  <View style={styles.roles}>
                    {ROLES.map(r => (
                      <Chip
                        key={r}
                        label={ROLE_LABEL[r]}
                        selected={item.role === r}
                        onPress={() => {
                          if (mine || r === item.role || busyId === item.uid) {
                            return;
                          }
                          void change(item, { role: r }, { title: `Make ${item.name} ${ROLE_LABEL[r]}?`, confirmLabel: 'Change role' }, `Now ${ROLE_LABEL[r]}`);
                        }}
                      />
                    ))}
                  </View>
                  {mine ? (
                    <Text variant="caption" color="textTertiary" style={styles.meta}>
                      This is you. You cannot change your own role or suspend yourself.
                    </Text>
                  ) : (
                    <View style={styles.buttons}>
                      <Button
                        title="Suspend"
                        variant="danger"
                        size="md"
                        disabled={busyId === item.uid}
                        onPress={() => void change(item, { status: 'suspended' }, { title: `Suspend ${item.name}?`, message: 'They are signed out and lose access until you allow them again.', confirmLabel: 'Suspend' }, 'Suspended')}
                      />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.buttons}>
                  <Button title="Allow again" size="md" disabled={busyId === item.uid} onPress={() => void change(item, { status: 'active' }, undefined, 'Allowed again')} />
                </View>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { paddingHorizontal: GUTTER, paddingTop: 12 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 12 },
  list: { paddingHorizontal: GUTTER, paddingTop: 16, flexGrow: 1 },
  sep: { height: 12 },
  head: { flexDirection: 'row', alignItems: 'center' },
  headText: { flex: 1, marginLeft: 12 },
  meta: { marginTop: 10 },
  label: { marginTop: 14, marginBottom: 8 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  buttons: { marginTop: 14 },
});
