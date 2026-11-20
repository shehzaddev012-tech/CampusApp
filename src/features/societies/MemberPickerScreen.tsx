import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search, UserX } from 'lucide-react-native';

import { Avatar, EmptyState, Input, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { AdminMember, ROLE_LABEL } from '../../types/domain';
import { confirm } from '../../utils/confirm';

type Props = NativeStackScreenProps<AppStackParamList, 'MemberPicker'>;

/** Admin: choose which approved member becomes a head of the society. */
export function MemberPickerScreen({ navigation, route }: Props) {
  const { societyId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    backend.admin
      .listMembers('active')
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (members ?? []).filter(m => !q || m.name.toLowerCase().includes(q) || m.studentId.toLowerCase().includes(q) || m.department.toLowerCase().includes(q));
  }, [members, query]);

  const choose = async (m: AdminMember) => {
    if (!(await confirm({ title: `Make ${m.name} a head?`, message: 'They can post updates, create events and add photos for this society.', confirmLabel: 'Make head', tone: 'neutral' }))) {
      return;
    }
    try {
      await backend.societies.assignHead(societyId, m.uid);
      show({ title: 'Head added', body: m.name, tone: 'success' });
      navigation.goBack();
    } catch (e) {
      show({ title: 'Could not add the head', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar close title="Choose a head" onBack={() => navigation.goBack()} />
      <View style={styles.search}>
        <Input icon={Search} placeholder="Search by name, ID or department" value={query} onChangeText={setQuery} />
      </View>
      <FlatList
        data={shown}
        keyExtractor={m => m.uid}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListEmptyComponent={<EmptyState icon={UserX} title={members === null ? 'Loading…' : 'Nobody found'} message="Only approved members of your university can be chosen." />}
        renderItem={({ item }) => (
          <PressableScale onPress={() => choose(item)} scaleTo={0.99} accessibilityRole="button" style={[styles.row, { borderColor: colors.border }]}>
            <Avatar name={item.name} uri={item.photoUrl} size={44} />
            <View style={styles.text}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {item.name}
              </Text>
              <Text variant="small" color="textSecondary" numberOfLines={1}>
                {item.studentId} · {item.department} · {ROLE_LABEL[item.role]}
              </Text>
            </View>
          </PressableScale>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  search: { paddingHorizontal: GUTTER, paddingTop: 12 },
  list: { paddingHorizontal: GUTTER, paddingTop: 8, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, marginLeft: 12 },
});
