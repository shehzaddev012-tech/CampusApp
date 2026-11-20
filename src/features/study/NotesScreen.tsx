import React, { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BookOpen, FileText, Plus, ThumbsUp } from 'lucide-react-native';

import { Badge, Card, Chip, EmptyState, IconButton, Input, PressableScale, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { GUTTER, useTheme } from '../../theme';
import { NOTE_KINDS, type NoteKind, type StudyNote } from '../../types/domain';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'Notes'>;

export function NotesScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<NoteKind | undefined>();
  const [course, setCourse] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ notes: StudyNote[]; courses: string[] } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await backend.study.listNotes({ q: q.trim() || undefined, kind, course }));
    } catch {
      setData(prev => prev ?? { notes: [], courses: [] });
    }
  }, [q, kind, course]);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(load, 250);
      return () => clearTimeout(t);
    }, [load]),
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Notes and past papers" onBack={() => navigation.goBack()} right={<IconButton icon={Plus} onPress={() => navigation.navigate('NoteForm')} accessibilityLabel="Share notes" />} />
      <View style={styles.search}>
        <Input placeholder="Search by title or course" value={q} onChangeText={setQ} returnKeyType="search" />
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Chip label="All" selected={!kind && !course} onPress={() => { setKind(undefined); setCourse(undefined); }} />
          {NOTE_KINDS.map(k => (
            <Chip key={k.value} label={k.label} selected={kind === k.value} onPress={() => setKind(kind === k.value ? undefined : k.value)} />
          ))}
          {(data?.courses ?? []).map(c => (
            <Chip key={c} label={c} selected={course === c} onPress={() => setCourse(course === c ? undefined : c)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={data?.notes ?? []}
        keyExtractor={n => n.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          data === null ? (
            <Skeleton height={110} radius={20} />
          ) : (
            <EmptyState icon={BookOpen} title="No notes yet" message="Be the first to share lecture notes or a past paper for your course." actionLabel="Share notes" onAction={() => navigation.navigate('NoteForm')} />
          )
        }
        renderItem={({ item: n }) => (
          <PressableScale onPress={() => navigation.navigate('NoteDetail', { noteId: n.id })} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={n.title}>
            <Card padding={16}>
              <View style={styles.head}>
                <Badge label={NOTE_KINDS.find(k => k.value === n.kind)?.label ?? 'Notes'} tone="info" />
                <Text variant="caption" color="textTertiary">
                  {timeAgo(n.createdAt)}
                </Text>
              </View>
              <Text variant="title3" style={styles.title} numberOfLines={2}>
                {n.title}
              </Text>
              <Text variant="small" color="textSecondary" style={styles.sub}>
                {n.course} · {n.department}
              </Text>
              <View style={styles.foot}>
                <View style={styles.meta}>
                  <FileText size={14} color={colors.textTertiary} />
                  <Text variant="caption" color="textTertiary" style={styles.metaText}>
                    {n.fileCount} {n.fileCount === 1 ? 'file' : 'files'}
                  </Text>
                </View>
                <View style={styles.meta}>
                  <ThumbsUp size={14} color={n.iFoundHelpful ? colors.primary : colors.textTertiary} />
                  <Text variant="caption" color="textTertiary" style={styles.metaText}>
                    {n.helpfulCount} found this helpful
                  </Text>
                </View>
                <Text variant="caption" color="textTertiary" numberOfLines={1} style={styles.by}>
                  {n.mine ? 'You' : n.uploaderName}
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
  filters: { gap: 8, paddingHorizontal: GUTTER, paddingVertical: 12 },
  list: { paddingHorizontal: GUTTER, paddingTop: 4, flexGrow: 1 },
  sep: { height: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: 10 },
  sub: { marginTop: 4 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 5 },
  by: { flex: 1, textAlign: 'right' },
});
