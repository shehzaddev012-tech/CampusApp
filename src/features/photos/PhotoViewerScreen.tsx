import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Heart, Star, Trash2 } from 'lucide-react-native';

import { Text } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useAlbumView } from '../../store/albumStore';
import { PALETTE } from '../../theme';
import { confirm } from '../../utils/confirm';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'PhotoViewer'>;

/** Full-screen photos you swipe through. Heart the ones you love; the most-loved one is the album's best shot. */
export function PhotoViewerScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const view = useAlbumView(s => s.view);
  const toggleLike = useAlbumView(s => s.toggleLike);
  const deletePhoto = useAlbumView(s => s.deletePhoto);

  const photos = useMemo(() => view?.photos ?? [], [view]);
  const startIndex = Math.max(0, photos.findIndex(p => p.id === route.params.photoId));
  const [index, setIndex] = useState(startIndex);
  const list = useRef<FlatList>(null);

  const current = photos[Math.min(index, photos.length - 1)];

  const onEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width)),
    [width],
  );

  if (!view || photos.length === 0 || !current) {
    // The last picture was deleted (or the album closed): nothing left to show.
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={[styles.back, { top: insets.top + 8 }]}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  }

  const confirmDelete = async () => {
    if (!(await confirm({ title: 'Delete this photo?', message: 'It is removed for everyone.', confirmLabel: 'Delete photo' }))) {
      return;
    }
    const ok = await deletePhoto(current.id);
    if (ok && photos.length <= 1) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <FlatList
        ref={list}
        data={photos}
        keyExtractor={p => p.id}
        horizontal
        pagingEnabled
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onEnd}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <Image source={{ uri: item.url }} style={styles.image} resizeMode="contain" accessibilityLabel={`Photo by ${item.uploaderName ?? 'a student'}`} />
          </View>
        )}
      />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.round}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </Pressable>
        <Text variant="smallStrong" color="#FFFFFF" style={styles.counter}>
          {Math.min(index, photos.length - 1) + 1} / {photos.length}
        </Text>
        {current.canDelete ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Delete photo" onPress={confirmDelete} style={styles.round}>
            <Trash2 size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={styles.round} />
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.who}>
          <Text variant="bodyStrong" color="#FFFFFF" numberOfLines={1}>
            {current.uploaderName ?? 'A student'}
          </Text>
          <View style={styles.whoRow}>
            <Text variant="caption" color="rgba(255,255,255,0.7)">
              {timeAgo(current.createdAt)}
            </Text>
            {current.id === view.bestPhotoId ? (
              <View style={[styles.bestPill, { backgroundColor: PALETTE.yellow }]}>
                <Star size={11} color={PALETTE.ink} fill={PALETTE.ink} />
                <Text variant="caption" color={PALETTE.ink} style={styles.bestText}>
                  Best shot
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={current.liked ? 'Remove like' : 'Like photo'} accessibilityState={{ selected: current.liked }} onPress={() => toggleLike(current)} style={styles.like}>
          <Heart size={26} color={current.liked ? PALETTE.coral : '#FFFFFF'} fill={current.liked ? PALETTE.coral : 'transparent'} strokeWidth={2} />
          <Text variant="smallStrong" color="#FFFFFF" style={styles.likeCount}>
            {current.likeCount}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  image: { width: '100%', height: '100%' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  back: { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  counter: { backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: 'hidden' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 40, backgroundColor: 'rgba(0,0,0,0.35)' },
  who: { flex: 1, marginRight: 16 },
  whoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 10 },
  bestPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  bestText: { marginLeft: 4 },
  like: { alignItems: 'center', minWidth: 48 },
  likeCount: { marginTop: 2 },
});
