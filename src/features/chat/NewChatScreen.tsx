import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search } from 'lucide-react-native';

import { Avatar, EmptyState, Input, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import type { Person } from '../../types/domain';

type Props = NativeStackScreenProps<AppStackParamList, 'NewChat'>;

export function NewChatScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Person[] | null>(null);

  useEffect(() => {
    if (q.trim().length === 0) {
      setPeople(null);
      return;
    }
    const t = setTimeout(() => {
      backend.chat
        .people(q.trim())
        .then(setPeople)
        .catch(() => setPeople([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const open = async (p: Person) => {
    try {
      const c = await backend.chat.startDm(p.uid);
      navigation.replace('Chat', { chatId: c.id, title: c.title, kind: 'dm', otherUserId: p.uid });
    } catch (e) {
      show({ title: 'Could not start the chat', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar close title="New message" onBack={() => navigation.goBack()} />
      <View style={styles.search}>
        <Input placeholder="Search a classmate by name" value={q} onChangeText={setQ} autoFocus icon={Search} />
      </View>
      <FlatList
        data={people ?? []}
        keyExtractor={p => p.uid}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListEmptyComponent={people === null ? <View /> : <EmptyState icon={Search} title="No one found" message="Only students at your university can be found." />}
        renderItem={({ item: p }) => (
          <PressableScale onPress={() => open(p)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Message ${p.name}`} style={styles.rowWrap}>
            <View style={styles.row}>
              <Avatar name={p.name} size={44} />
              <View style={styles.text}>
                <Text variant="cardTitle" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text variant="caption" color="textTertiary">
                  {p.department} · Batch {p.batch}
                </Text>
              </View>
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
  rowWrap: { paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  text: { flex: 1 },
});
