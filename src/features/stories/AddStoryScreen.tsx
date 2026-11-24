import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { ImagePlus, Type } from 'lucide-react-native';

import { Button, Input, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useToast } from '../../store/toastStore';
import { PALETTE, useTheme } from '../../theme';
import type { PickedPhoto } from '../../types/domain';

type Props = NativeStackScreenProps<AppStackParamList, 'AddStory'>;

/** Backgrounds for a story that is only words. */
const BACKGROUNDS = [PALETTE.ink, '#2F6B4F', '#2B5FA8', '#7A3E9D', '#C2410C', '#B4235B'];
const WORDS_MAX = 280;

export function AddStoryScreen({ navigation }: Props) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [mode, setMode] = useState<'text' | 'photo'>('text');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [caption, setCaption] = useState('');
  const [words, setWords] = useState('');
  const [bg, setBg] = useState(BACKGROUNDS[0]!);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8, maxWidth: 1600, maxHeight: 2400 });
    const a = res.assets?.[0];
    if (a?.uri) {
      setPhoto({ uri: a.uri, name: a.fileName ?? 'story.jpg', type: a.type ?? 'image/jpeg' });
    }
  };

  const ready = mode === 'photo' ? !!photo : words.trim().length > 0;

  const share = async () => {
    if (!ready || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'photo') {
        await backend.stories.post(photo, caption.trim());
      } else {
        await backend.stories.post(null, words.trim(), bg);
      }
      show({ title: 'Story shared', body: 'It stays up for 24 hours.', tone: 'success' });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const tab = (id: 'text' | 'photo', label: string, Icon: typeof Type) => (
    <Pressable
      key={id}
      onPress={() => setMode(id)}
      accessibilityRole="tab"
      accessibilityState={{ selected: mode === id }}
      style={[styles.tab, { backgroundColor: mode === id ? colors.primary : colors.surfaceAlt, borderRadius: radius.pill }]}>
      <Icon size={16} color={mode === id ? colors.onPrimary : colors.textSecondary} />
      <Text variant="smallStrong" color={mode === id ? 'onPrimary' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar close title="New story" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.tabs}>
          {tab('text', 'Text', Type)}
          {tab('photo', 'Photo', ImagePlus)}
        </View>

        {mode === 'text' ? (
          <>
            <View style={[styles.preview, { backgroundColor: bg, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
              <TextInput
                value={words}
                onChangeText={setWords}
                placeholder="Type a status"
                placeholderTextColor="rgba(255,255,255,0.6)"
                multiline
                maxLength={WORDS_MAX}
                textAlign="center"
                style={styles.words}
                accessibilityLabel="Your story text"
              />
            </View>
            <View style={styles.swatches}>
              {BACKGROUNDS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => setBg(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Background ${c}`}
                  style={[styles.swatch, { backgroundColor: c, borderColor: bg === c ? colors.text : 'transparent' }]}
                />
              ))}
            </View>
            <Text variant="caption" color="textTertiary" style={styles.hint}>
              {words.length}/{WORDS_MAX}
            </Text>
          </>
        ) : (
          <>
            <PressableScale
              onPress={pick}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={photo ? 'Choose a different picture' : 'Choose a picture'}
              style={[styles.preview, { borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }]}>
              {photo ? (
                <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.empty}>
                  <ImagePlus size={32} color={colors.textTertiary} />
                  <Text variant="smallStrong" color="textSecondary">
                    Choose a picture
                  </Text>
                </View>
              )}
            </PressableScale>
            {photo ? (
              <Text variant="caption" color="textTertiary" style={styles.hint}>
                Tap the picture to change it.
              </Text>
            ) : null}
            <View style={styles.field}>
              <Input label="Add a line (optional)" placeholder="What is happening?" value={caption} onChangeText={setCaption} maxLength={140} />
            </View>
          </>
        )}

        <Text variant="caption" color="textTertiary" style={styles.hint}>
          Everyone at your university can see it for 24 hours. You can delete it any time.
        </Text>
        {error ? (
          <Text variant="small" color="danger" style={styles.hint}>
            {error}
          </Text>
        ) : null}
        <View style={styles.field}>
          <Button title="Share story" onPress={share} loading={busy} disabled={!ready} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, minHeight: 40 },
  preview: { height: 360, overflow: 'hidden' },
  words: { color: '#FFFFFF', fontSize: 26, lineHeight: 36, fontWeight: '600', width: '100%', maxHeight: 300 },
  swatches: { flexDirection: 'row', gap: 12, marginTop: 14 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2.5 },
  image: { width: '100%', height: '100%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  hint: { marginTop: 8 },
  field: { marginTop: 16 },
});
