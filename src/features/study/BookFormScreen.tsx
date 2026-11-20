import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { ImagePlus, X } from 'lucide-react-native';

import { Button, Chip, IconButton, Input, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { BOOK_CONDITIONS, type BookCondition, type PickedPhoto } from '../../types/domain';
import { FormError } from '../auth/AuthPage';

type Props = NativeStackScreenProps<AppStackParamList, 'BookForm'>;

export function BookFormScreen({ navigation }: Props) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [course, setCourse] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<BookCondition>('good');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceNum = price.trim() === '' ? NaN : Number(price.replace(/,/g, ''));
  const valid = title.trim().length >= 2 && Number.isInteger(priceNum) && priceNum >= 0;

  const pick = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 3 - photos.length, quality: 0.8, maxWidth: 2000, maxHeight: 2000 });
    const more = (res.assets ?? []).filter(a => a.uri).map(a => ({ uri: a.uri as string, name: a.fileName ?? 'book.jpg', type: a.type ?? 'image/jpeg' }));
    setPhotos(prev => [...prev, ...more].slice(0, 3));
  };

  const save = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await backend.study.createBook({ title: title.trim(), author: author.trim(), course: course.trim(), price: priceNum, condition, description: description.trim(), photos });
      show({ title: 'Listed', body: 'Interested students will contact you.', tone: 'success' });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar close title="Sell a book" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text variant="smallStrong" style={styles.label}>
          Photos ({photos.length}/3)
        </Text>
        <View style={styles.photos}>
          {photos.map((p, i) => (
            <View key={`${p.uri}-${i}`} style={[styles.photoBox, { borderRadius: radius.md }]}>
              <Image source={{ uri: p.uri }} style={styles.photoImg} />
              <View style={styles.remove}>
                <IconButton icon={X} size={28} onPress={() => setPhotos(prev => prev.filter((_, j) => j !== i))} accessibilityLabel="Remove photo" />
              </View>
            </View>
          ))}
          {photos.length < 3 ? (
            <PressableScale onPress={pick} scaleTo={0.96} accessibilityRole="button" accessibilityLabel="Add photos" style={[styles.photoBox, styles.add, { borderColor: colors.border, borderRadius: radius.md }]}>
              <ImagePlus size={24} color={colors.textTertiary} />
            </PressableScale>
          ) : null}
        </View>

        <View style={styles.field}>
          <Input label="Title" placeholder="e.g. Introduction to Algorithms" value={title} onChangeText={setTitle} maxLength={100} />
        </View>
        <View style={styles.field}>
          <Input label="Author (optional)" value={author} onChangeText={setAuthor} maxLength={80} />
        </View>
        <View style={styles.field}>
          <Input label="Course (optional)" placeholder="e.g. CS301" value={course} onChangeText={setCourse} autoCapitalize="characters" maxLength={60} />
        </View>
        <View style={styles.field}>
          <Input label="Price (Rs)" placeholder="0 for free" value={price} onChangeText={t => setPrice(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={7} />
        </View>
        <View style={styles.field}>
          <Text variant="smallStrong" style={styles.label}>
            Condition
          </Text>
          <View style={styles.chips}>
            {BOOK_CONDITIONS.map(c => (
              <Chip key={c.value} label={c.label} selected={condition === c.value} onPress={() => setCondition(c.value)} />
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Input label="Details (optional)" placeholder="Edition, notes inside, where to meet" value={description} onChangeText={setDescription} multiline maxLength={500} />
        </View>
        <View style={styles.field}>
          <FormError message={error} />
          <Button title="List the book" onPress={save} loading={busy} disabled={!valid} />
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
  photos: { flexDirection: 'row', gap: 10 },
  photoBox: { width: 92, height: 92, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  remove: { position: 'absolute', top: 4, right: 4 },
  add: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
