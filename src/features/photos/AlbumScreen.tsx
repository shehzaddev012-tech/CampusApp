import React, { useCallback, useEffect } from 'react';
import { Alert, FlatList, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { Camera, Heart, ImageOff, MoreHorizontal, Star } from 'lucide-react-native';

import { BrandLoader, Button, EmptyState, IconButton, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useAlbumView } from '../../store/albumStore';
import { useToast } from '../../store/toastStore';
import { PALETTE, useTheme } from '../../theme';
import { confirm } from '../../utils/confirm';
import type { PickedPhoto } from '../../types/domain';

type Props = NativeStackScreenProps<AppStackParamList, 'Album'>;

const COLUMNS = 3;
const GAP = 2;

export function AlbumScreen({ navigation, route }: Props) {
  const { albumId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const show = useToast(s => s.show);

  const view = useAlbumView(s => s.view);
  const loading = useAlbumView(s => s.loading);
  const loadingMore = useAlbumView(s => s.loadingMore);
  const uploading = useAlbumView(s => s.uploading);
  const error = useAlbumView(s => s.error);
  const open = useAlbumView(s => s.open);
  const loadMore = useAlbumView(s => s.loadMore);
  const close = useAlbumView(s => s.close);
  const upload = useAlbumView(s => s.upload);

  useEffect(() => {
    open(albumId);
    return close;
  }, [albumId, open, close]);

  const size = (width - GAP * (COLUMNS - 1)) / COLUMNS;
  const mine = view && view.album.id === albumId ? view : null;

  const pick = useCallback(async () => {
    const res = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 10, quality: 0.8, maxWidth: 2400, maxHeight: 2400 });
    if (res.didCancel) {
      return;
    }
    if (res.errorCode) {
      show({ title: 'Could not open your photos', body: res.errorMessage, tone: 'alert' });
      return;
    }
    const files: PickedPhoto[] = (res.assets ?? [])
      .filter(a => !!a.uri)
      .map((a, i) => ({ uri: a.uri as string, name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`, type: a.type ?? 'image/jpeg' }));
    if (files.length === 0) {
      return;
    }
    if (await upload(files)) {
      show({ title: files.length === 1 ? 'Photo added' : `${files.length} photos added`, tone: 'success' });
    }
  }, [upload, show]);

  const manage = () => {
    if (!mine) {
      return;
    }
    Alert.alert(mine.album.title, undefined, [
      { text: 'Rename', onPress: () => navigation.navigate('AlbumForm', { albumId }) },
      {
        text: 'Delete album',
        style: 'destructive',
        onPress: async () => {
          if (!(await confirm({ title: 'Delete this album?', message: `All ${mine.album.photoCount} photos in it are deleted for everyone.`, confirmLabel: 'Delete album' }))) {
            return;
          }
          try {
            await backend.albums.remove(albumId);
            navigation.goBack();
          } catch (e) {
            show({ title: 'Could not delete', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ], { cancelable: false });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title={mine?.album.title ?? 'Album'}
        onBack={() => navigation.goBack()}
        right={mine?.album.canManage ? <IconButton icon={MoreHorizontal} onPress={manage} accessibilityLabel="Album options" /> : undefined}
      />

      {error && !mine ? (
        <EmptyState icon={ImageOff} title="Could not open this album" message={error} actionLabel="Try again" onAction={() => open(albumId)} />
      ) : !mine ? (
        <View style={styles.center}>
          <BrandLoader size={64} />
        </View>
      ) : (
        <FlatList
          data={mine.photos}
          keyExtractor={p => p.id}
          numColumns={COLUMNS}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.6}
          onEndReached={loadMore}
          refreshing={loading}
          onRefresh={() => open(albumId)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
          ListHeaderComponent={
            <View style={styles.head}>
              <Text variant="body" color="textSecondary">
                {mine.album.photoCount} {mine.album.photoCount === 1 ? 'photo' : 'photos'}
                {mine.album.createdByName ? ` · by ${mine.album.createdByName}` : ''}
              </Text>
            </View>
          }
          ListEmptyComponent={<EmptyState icon={Camera} title="No photos yet" message="Be the first to add one." />}
          ListFooterComponent={loadingMore ? <BrandLoader size={36} style={styles.more} /> : undefined}
          renderItem={({ item }) => (
            <PressableScale onPress={() => navigation.navigate('PhotoViewer', { photoId: item.id })} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Open photo" style={{ width: size, height: size }}>
              <Image source={{ uri: item.thumbUrl }} style={[styles.thumb, { backgroundColor: colors.surfaceAlt }]} resizeMode="cover" />
              {item.id === mine.bestPhotoId ? (
                <View style={[styles.best, { backgroundColor: colors.yellow }]}>
                  <Star size={12} color={PALETTE.ink} fill={PALETTE.ink} />
                </View>
              ) : null}
              {item.likeCount > 0 ? (
                <View style={styles.likes}>
                  <Heart size={11} color="#FFFFFF" fill="#FFFFFF" />
                  <Text variant="caption" color="#FFFFFF" style={styles.likeCount}>
                    {item.likeCount}
                  </Text>
                </View>
              ) : null}
            </PressableScale>
          )}
        />
      )}

      {mine ? (
        <View style={[styles.cta, { paddingBottom: insets.bottom + 14, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Button title={uploading ? 'Uploading…' : 'Add photos'} icon={Camera} onPress={pick} loading={uploading} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flexGrow: 1 },
  head: { paddingHorizontal: 20, paddingVertical: 14 },
  more: { marginVertical: 20 },
  thumb: { width: '100%', height: '100%' },
  best: { position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  likes: { position: 'absolute', right: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,35,29,0.6)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  likeCount: { marginLeft: 3 },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
});
