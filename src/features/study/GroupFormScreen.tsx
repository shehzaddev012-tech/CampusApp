import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Chip, Input, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { FormError } from '../auth/AuthPage';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupForm'>;

const SIZES = [4, 6, 10, 20];

export function GroupFormScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [meeting, setMeeting] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length >= 3;

  const save = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const g = await backend.study.createGroup({ title: title.trim(), course: course.trim(), description: description.trim(), meeting: meeting.trim(), capacity });
      show({ title: 'Group started', body: 'Others can now find and join it.', tone: 'success' });
      navigation.replace('GroupDetail', { groupId: g.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar close title="Start a study group" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Input label="Group name" placeholder="e.g. CS201 exam prep" value={title} onChangeText={setTitle} maxLength={80} />
        <View style={styles.field}>
          <Input label="Course (optional)" placeholder="e.g. CS201" value={course} onChangeText={setCourse} autoCapitalize="characters" maxLength={60} />
        </View>
        <View style={styles.field}>
          <Input label="When and where" placeholder="e.g. Library, Thursdays 4 PM" value={meeting} onChangeText={setMeeting} maxLength={120} />
        </View>
        <View style={styles.field}>
          <Text variant="smallStrong" style={styles.label}>
            How many people?
          </Text>
          <View style={styles.chips}>
            {SIZES.map(n => (
              <Chip key={n} label={`${n}`} selected={capacity === n} onPress={() => setCapacity(n)} />
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Input label="About (optional)" placeholder="What will you study? Who is it for?" value={description} onChangeText={setDescription} multiline maxLength={500} />
        </View>
        <View style={styles.field}>
          <FormError message={error} />
          <Button title="Start the group" onPress={save} loading={busy} disabled={!valid} />
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
  chips: { flexDirection: 'row', gap: 8 },
});
