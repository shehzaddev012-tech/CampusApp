import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Input, SegmentedControl, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import type { LostKind } from '../../types/domain';
import { FormError } from '../auth/AuthPage';
import { minHint } from '../../utils/minHint';

type Props = NativeStackScreenProps<AppStackParamList, 'LostItemForm'>;

export function LostItemFormScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [kind, setKind] = useState<LostKind>('lost');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
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
      await backend.lostFound.create({ kind, title: title.trim(), place: place.trim(), description: description.trim() });
      show({ title: 'Posted', body: kind === 'lost' ? 'We will tell you when someone replies.' : 'The owner can now find it.', tone: 'success' });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar close title="Post an item" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <SegmentedControl<LostKind>
          value={kind}
          onChange={setKind}
          options={[
            { value: 'lost', label: 'I lost something' },
            { value: 'found', label: 'I found something' },
          ]}
        />
        <View style={styles.field}>
          <Input label="What is it?" placeholder={kind === 'lost' ? 'e.g. Black wallet' : 'e.g. Blue water bottle'} value={title} onChangeText={setTitle} maxLength={80} hint={minHint(title, 3)} />
        </View>
        <View style={styles.field}>
          <Input label="Where?" placeholder={kind === 'lost' ? 'Where did you last have it?' : 'Where did you find it?'} value={place} onChangeText={setPlace} maxLength={80} />
        </View>
        <View style={styles.field}>
          <Input
            label="Details"
            placeholder="Colour, brand, anything that proves it is yours. Do not put phone numbers here."
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
        </View>
        <View style={styles.field}>
          <FormError message={error} />
          <Button title="Post" onPress={save} loading={busy} disabled={!valid} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 20 },
  field: { marginTop: 20 },
});
