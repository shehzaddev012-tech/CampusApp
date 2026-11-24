import React, { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Search, X } from 'lucide-react-native';

import { Avatar, Button, EmptyState, Input, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { GUTTER, useTheme } from '../../theme';
import type { Person } from '../../types/domain';

type Props = NativeStackScreenProps<AppStackParamList, 'NewGroup'>;

const MAX_PEOPLE = 99;

/** Make a group chat: a name, and the classmates to put in it. You become its admin. */
export function NewGroupScreen({ navigation }: Props) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Person[] | null>(null);
  const [chosen, setChosen] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Empty search = everyone at the university, A to Z.
    const t = setTimeout(() => {
      backend.chat
        .people(q.trim())
        .then(setFound)
        .catch(() => setFound([]));
    }, q.trim().length === 0 ? 0 : 250);
    return () => clearTimeout(t);
  }, [q]);

  const isChosen = (p: Person) => chosen.some(c => c.uid === p.uid);
  const toggle = (p: Person) => setChosen(prev => (prev.some(c => c.uid === p.uid) ? prev.filter(c => c.uid !== p.uid) : prev.length < MAX_PEOPLE ? [...prev, p] : prev));

  const valid = name.trim().length >= 2;

  const create = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const g = await backend.chat.createGroup({ name: name.trim(), about: about.trim(), memberIds: chosen.map(c => c.uid) });
      navigation.replace('Chat', { chatId: g.id, title: g.title, kind: 'custom' });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar close title="New group" onBack={() => navigation.goBack()} />
      <FlatList
        data={found ?? []}
        keyExtractor={p => p.uid}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
        ListHeaderComponent={
          <View>
            <Input label="Group name" placeholder="e.g. Algorithms study crew" value={name} onChangeText={setName} maxLength={60} />
            <View style={styles.gap}>
              <Input label="About (optional)" placeholder="What is this group for?" value={about} onChangeText={setAbout} maxLength={300} />
            </View>
            {chosen.length > 0 ? (
              <View style={styles.gap}>
                <Text variant="smallStrong" style={styles.label}>
                  In this group ({chosen.length + 1})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {chosen.map(c => (
                    <PressableScale key={c.uid} onPress={() => toggle(c)} scaleTo={0.95} accessibilityRole="button" accessibilityLabel={`Remove ${c.name}`} style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
                      <Avatar name={c.name} uri={c.photoUrl} size={24} />
                      <Text variant="smallStrong" numberOfLines={1} style={styles.chipText}>
                        {c.name.split(' ')[0]}
                      </Text>
                      <X size={14} color={colors.textSecondary} />
                    </PressableScale>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <View style={styles.gap}>
              <Input label="Add people" placeholder="Search a classmate by name" value={q} onChangeText={setQ} icon={Search} />
            </View>
          </View>
        }
        ListEmptyComponent={found === null ? <View /> : <EmptyState icon={Search} title="No one found" message="Only students at your university can be found." />}
        renderItem={({ item: p }) => (
          <PressableScale onPress={() => toggle(p)} scaleTo={0.98} accessibilityRole="checkbox" accessibilityState={{ checked: isChosen(p) }} accessibilityLabel={p.name} style={styles.rowWrap}>
            <View style={styles.row}>
              <Avatar name={p.name} uri={p.photoUrl} size={44} />
              <View style={styles.text}>
                <Text variant="cardTitle" numberOfLines={1}>
                  {p.name}
                </Text>
                <Text variant="caption" color="textTertiary">
                  {p.department}
                </Text>
              </View>
              <View style={[styles.check, { borderColor: isChosen(p) ? colors.primary : colors.border, backgroundColor: isChosen(p) ? colors.primary : 'transparent' }]}>
                {isChosen(p) ? <Check size={14} color={colors.onPrimary} /> : null}
              </View>
            </View>
          </PressableScale>
        )}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {error ? (
          <Text variant="small" color="danger" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button title={chosen.length === 0 ? 'Create group' : `Create group with ${chosen.length} ${chosen.length === 1 ? 'person' : 'people'}`} onPress={create} loading={busy} disabled={!valid} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: GUTTER, paddingTop: 16, flexGrow: 1 },
  gap: { marginTop: 14 },
  label: { marginBottom: 8 },
  chips: { gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6, paddingRight: 10, paddingVertical: 6, maxWidth: 160 },
  chipText: { flexShrink: 1 },
  rowWrap: { paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  text: { flex: 1 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  error: { marginBottom: 8 },
});
