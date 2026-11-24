import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';

import { Button, Chip, EmptyState, Input, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useAlbumView } from '../../store/albumStore';
import { useSession } from '../../store/sessionStore';
import { manageableSocieties, useSocieties } from '../../store/societyStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, categoryColor, useTheme } from '../../theme';
import { EVENT_CATEGORIES, EventCategory } from '../../types/domain';
import { FormError } from '../auth/AuthPage';

type Props = NativeStackScreenProps<AppStackParamList, 'AlbumForm'>;

/** Create an album for a society (or the whole university, for admins), or rename one. */
export function AlbumFormScreen({ navigation, route }: Props) {
  const albumId = route.params?.albumId;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const role = useSession(s => s.membership?.role);
  const show = useToast(s => s.show);
  const societies = useSocieties(s => s.societies);
  const existing = useAlbumView(s => (s.view && s.view.album.id === albumId ? s.view.album : null));

  const isAdmin = role === 'uni_admin';
  const mine = manageableSocieties(societies, isAdmin);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [category, setCategory] = useState<EventCategory>(existing?.category ?? 'Social');
  const [societyId, setSocietyId] = useState<string | null>(route.params?.societyId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A society head must choose one of their societies; with exactly one, choose it for them.
  useEffect(() => {
    if (!albumId && !isAdmin && !societyId && mine.length === 1) {
      setSocietyId(mine[0]?.id ?? null);
    }
  }, [albumId, isAdmin, societyId, mine]);

  const allowed = albumId ? true : isAdmin || mine.length > 0;
  if (!allowed) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar close title="New album" onBack={() => navigation.goBack()} />
        <EmptyState icon={Lock} title="You cannot create albums" message="Society heads and admins can create albums." />
      </View>
    );
  }

  const needsSociety = !albumId && !isAdmin;
  const valid = title.trim().length >= 2 && (!needsSociety || !!societyId);

  const save = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (albumId) {
        await backend.albums.update(albumId, { title: title.trim(), category });
        await useAlbumView.getState().open(albumId);
        show({ title: 'Saved', tone: 'success' });
        navigation.goBack();
      } else {
        const created = await backend.albums.create({ title: title.trim(), category, societyId });
        show({ title: 'Album created', body: 'Add the first photos.', tone: 'success' });
        navigation.replace('Album', { albumId: created.id });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar close title={albumId ? 'Rename album' : 'New album'} onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Input label="Album name" placeholder="e.g. Tech Fest 2026" value={title} onChangeText={setTitle} maxLength={80} />

        <Text variant="smallStrong" style={styles.label}>
          Category
        </Text>
        <View style={styles.chips}>
          {EVENT_CATEGORIES.map(c => (
            <Chip key={c} label={c} dot={categoryColor(colors, c)} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        {!albumId && mine.length > 0 ? (
          <>
            <Text variant="smallStrong" style={styles.label}>
              {needsSociety ? 'For which society?' : 'Society (optional)'}
            </Text>
            <View style={styles.chips}>
              {isAdmin ? <Chip label="Whole university" selected={societyId === null} onPress={() => setSocietyId(null)} /> : null}
              {mine.map(s => (
                <Chip key={s.id} label={s.name} selected={societyId === s.id} onPress={() => setSocietyId(s.id)} />
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.field}>
          <FormError message={error} />
          <Button title={albumId ? 'Save' : 'Create album'} onPress={save} loading={busy} disabled={!valid} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 20 },
  label: { marginTop: 22, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { marginTop: 28, gap: 12 },
});
