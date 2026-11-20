import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { FileText, Image as ImageIcon, X } from 'lucide-react-native';

import { Button, Card, Chip, IconButton, Input, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { NOTE_KINDS, type NoteKind, type PickedPhoto } from '../../types/domain';
import { FormError } from '../auth/AuthPage';

type Props = NativeStackScreenProps<AppStackParamList, 'NoteForm'>;

const MAX_FILES = 6;

export function NoteFormScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [kind, setKind] = useState<NoteKind>('notes');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length >= 3 && course.trim().length >= 2 && files.length > 0;

  const add = (more: PickedPhoto[]) => setFiles(prev => [...prev, ...more].slice(0, MAX_FILES));

  const pickPdf = async () => {
    try {
      const res = await pick({ type: [types.pdf], allowMultiSelection: true });
      add(res.map(r => ({ uri: r.uri, name: r.name ?? 'notes.pdf', type: 'application/pdf' })));
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED)) {
        show({ title: 'Could not pick the file', tone: 'alert' });
      }
    }
  };

  const pickPictures = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: MAX_FILES, quality: 0.8, maxWidth: 2400, maxHeight: 2400 });
    const picked = (res.assets ?? []).filter(a => a.uri).map(a => ({ uri: a.uri as string, name: a.fileName ?? 'page.jpg', type: a.type ?? 'image/jpeg' }));
    add(picked);
  };

  const save = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await backend.study.uploadNote({ title: title.trim(), course: course.trim(), kind, description: description.trim(), files });
      show({ title: 'Shared', body: 'Thanks. Your classmates can now find it.', tone: 'success' });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar close title="Share notes" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Input label="Title" placeholder="e.g. Data Structures: Week 1" value={title} onChangeText={setTitle} maxLength={100} />
        <View style={styles.field}>
          <Input label="Course" placeholder="e.g. CS201" value={course} onChangeText={setCourse} autoCapitalize="characters" maxLength={30} />
        </View>
        <View style={styles.field}>
          <Text variant="smallStrong" style={styles.label}>
            What is it?
          </Text>
          <View style={styles.chips}>
            {NOTE_KINDS.map(k => (
              <Chip key={k.value} label={k.label} selected={kind === k.value} onPress={() => setKind(k.value)} />
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Input label="Description (optional)" placeholder="What does it cover?" value={description} onChangeText={setDescription} multiline maxLength={500} />
        </View>

        <View style={styles.field}>
          <Text variant="smallStrong" style={styles.label}>
            Files ({files.length}/{MAX_FILES})
          </Text>
          {files.map((f, i) => (
            <View key={`${f.uri}-${i}`} style={styles.fileWrap}>
              <Card padding={10}>
                <View style={styles.file}>
                  {f.type === 'application/pdf' ? <FileText size={20} color={colors.text} /> : <ImageIcon size={20} color={colors.text} />}
                  <Text variant="small" numberOfLines={1} style={styles.fileName}>
                    {f.name}
                  </Text>
                  <IconButton icon={X} size={32} onPress={() => setFiles(prev => prev.filter((_, j) => j !== i))} accessibilityLabel={`Remove ${f.name}`} />
                </View>
              </Card>
            </View>
          ))}
          <View style={styles.pickRow}>
            <View style={styles.flex}>
              <Button title="Add PDF" variant="soft" size="md" icon={FileText} onPress={pickPdf} disabled={files.length >= MAX_FILES} />
            </View>
            <View style={styles.flex}>
              <Button title="Add pictures" variant="soft" size="md" icon={ImageIcon} onPress={pickPictures} disabled={files.length >= MAX_FILES} />
            </View>
          </View>
          <Text variant="caption" color="textTertiary" style={styles.hint}>
            PDF or pictures, up to 15 MB each. Only share what you are allowed to share.
          </Text>
        </View>

        <View style={styles.field}>
          <FormError message={error} />
          <Button title="Share" onPress={save} loading={busy} disabled={!valid} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 20 },
  field: { marginTop: 20 },
  label: { marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fileWrap: { marginBottom: 8 },
  file: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileName: { flex: 1 },
  pickRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  flex: { flex: 1 },
  hint: { marginTop: 8 },
});
