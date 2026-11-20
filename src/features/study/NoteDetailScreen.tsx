import React, { useCallback, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Download, FileText, Flag, ThumbsUp, Trash2 } from 'lucide-react-native';

import { Badge, Button, Card, IconButton, PressableScale, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { NOTE_KINDS, type NoteDetail } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { reportContent } from '../../utils/report';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'NoteDetail'>;

const size = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

export function NoteDetailScreen({ navigation, route }: Props) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [missing, setMissing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      backend.study
        .note(route.params.noteId)
        .then(setNote)
        .catch(() => setMissing(true));
    }, [route.params.noteId]),
  );

  const helpful = async () => {
    if (!note) {
      return;
    }
    const next = !note.iFoundHelpful;
    setNote({ ...note, iFoundHelpful: next, helpfulCount: note.helpfulCount + (next ? 1 : -1) });
    try {
      const r = await backend.study.setHelpful(note.id, next);
      setNote(n => (n ? { ...n, ...r } : n));
    } catch {
      setNote(note);
    }
  };

  const remove = async () => {
    if (!note || !(await confirm({ title: 'Delete these notes?', message: 'The files are removed for everyone. This cannot be undone.', confirmLabel: 'Delete' }))) {
      return;
    }
    try {
      await backend.study.removeNote(note.id);
      navigation.goBack();
    } catch (e) {
      show({ title: 'Could not delete', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  const open = (url: string) => {
    Linking.openURL(url).catch(() => show({ title: 'Could not open the file', body: 'No app on this phone can open it.', tone: 'alert' }));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title="Notes"
        onBack={() => navigation.goBack()}
        right={
          note && !note.mine ? (
            <IconButton icon={Flag} onPress={() => reportContent('note', note.id, 'note')} accessibilityLabel="Report" />
          ) : note?.canManage ? (
            <IconButton icon={Trash2} onPress={remove} accessibilityLabel="Delete" />
          ) : undefined
        }
      />
      {!note ? (
        <View style={styles.pad}>{missing ? <Text variant="body" color="textSecondary">These notes are no longer available.</Text> : <Skeleton height={160} radius={20} />}</View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <Badge label={NOTE_KINDS.find(k => k.value === note.kind)?.label ?? 'Notes'} tone="info" />
          <Text variant="title2" style={styles.title}>
            {note.title}
          </Text>
          <Text variant="small" color="textSecondary" style={styles.sub}>
            {note.course} · {note.department}
          </Text>
          <Text variant="caption" color="textTertiary" style={styles.sub}>
            Shared by {note.mine ? 'you' : note.uploaderName} · {timeAgo(note.createdAt)}
          </Text>
          {note.description ? (
            <Text variant="body" color="textSecondary" style={styles.desc}>
              {note.description}
            </Text>
          ) : null}

          <Text variant="cardTitle" style={styles.h}>
            Files
          </Text>
          {note.files.map(f => (
            <PressableScale key={f.id} onPress={() => open(f.url)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={`Open ${f.name}`} style={styles.fileWrap}>
              <Card padding={12}>
                <View style={styles.file}>
                  {f.mime === 'image/jpeg' ? (
                    <Image source={{ uri: f.url }} style={[styles.thumb, { borderRadius: radius.md }]} />
                  ) : (
                    <View style={[styles.thumb, styles.pdf, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}>
                      <FileText size={24} color={colors.text} />
                    </View>
                  )}
                  <View style={styles.fileText}>
                    <Text variant="cardTitle" numberOfLines={1}>
                      {f.name}
                    </Text>
                    <Text variant="caption" color="textTertiary">
                      {f.mime === 'application/pdf' ? 'PDF' : 'Picture'} · {size(f.bytes)}
                    </Text>
                  </View>
                  <Download size={20} color={colors.textTertiary} />
                </View>
              </Card>
            </PressableScale>
          ))}

          <View style={styles.helpful}>
            <Button
              title={note.iFoundHelpful ? `Helpful · ${note.helpfulCount}` : `This was helpful${note.helpfulCount ? ` · ${note.helpfulCount}` : ''}`}
              variant={note.iFoundHelpful ? 'soft' : 'primary'}
              icon={ThumbsUp}
              onPress={helpful}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: GUTTER },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
  title: { marginTop: 12 },
  sub: { marginTop: 6 },
  desc: { marginTop: 14 },
  h: { marginTop: 24, marginBottom: 10 },
  fileWrap: { marginBottom: 10 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 52, height: 52 },
  pdf: { alignItems: 'center', justifyContent: 'center' },
  fileText: { flex: 1 },
  helpful: { marginTop: 18 },
});
