import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Images, Plus } from 'lucide-react-native';

import { Badge, EmptyState, FadeIn, IconButton, PatternArt, PressableScale, Screen, ScreenHeader, SectionHeader, Skeleton, Text } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useAlbums } from '../../store/albumStore';
import { useSession } from '../../store/sessionStore';
import { PALETTE, useTheme } from '../../theme';
import type { Album } from '../../types/domain';
import { categoryArt } from '../events/eventArt';

const GAP = 3;

/**
 * Photos: an edge-to-edge gallery. Pictures are the focus: no borders, no card chrome, only a small
 * label on top of each cover. An album with no pictures yet shows flat artwork instead.
 */
export function PhotosScreen() {
  const { width } = useWindowDimensions();
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const albums = useAlbums(s => s.albums);
  const status = useAlbums(s => s.status);
  const role = useSession(s => s.membership?.role);
  const canCreate = role === 'society_head' || role === 'dept_admin' || role === 'uni_admin';

  const [lead, ...rest] = albums;
  const colW = (width - GAP) / 2;
  const left = rest.filter((_, i) => i % 2 === 0);
  const right = rest.filter((_, i) => i % 2 === 1);
  const open = (a: Album) => nav.navigate('Album', { albumId: a.id });

  return (
    <Screen scroll tabScreen padding={0}>
      <View style={styles.pad}>
        <ScreenHeader
          title="Photos"
          subtitle="Memories from every event"
          right={canCreate ? <IconButton icon={Plus} onPress={() => nav.navigate('AlbumForm')} accessibilityLabel="New album" /> : undefined}
        />
      </View>

      {status !== 'ready' && albums.length === 0 ? (
        <View style={styles.pad}>
          <Skeleton height={width * 0.7} radius={0} />
        </View>
      ) : !lead ? (
        <View style={styles.pad}>
          <EmptyState
            icon={Images}
            title="No albums yet"
            message={canCreate ? 'Create an album for an event and let everyone add their photos.' : 'Albums from your university events will appear here.'}
            actionLabel={canCreate ? 'Create an album' : undefined}
            onAction={canCreate ? () => nav.navigate('AlbumForm') : undefined}
          />
        </View>
      ) : (
        <>
          <FadeIn>
            <Cover album={lead} width={width} height={width * 0.78} large onPress={() => open(lead)} />
          </FadeIn>

          {rest.length > 0 ? (
            <>
              <View style={[styles.pad, styles.sectionHead]}>
                <SectionHeader eyebrow="Albums" title="All collections" />
              </View>
              <View style={styles.masonry}>
                <View style={{ width: colW }}>
                  {left.map(a => (
                    <Cover key={a.id} album={a} width={colW} height={coverHeight(a, colW)} onPress={() => open(a)} />
                  ))}
                </View>
                <View style={{ width: colW }}>
                  {right.map(a => (
                    <Cover key={a.id} album={a} width={colW} height={coverHeight(a, colW)} onPress={() => open(a)} />
                  ))}
                </View>
              </View>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

/** Staggered heights: follow the cover picture's shape (within sensible limits), or a fixed shape without one. */
function coverHeight(a: Album, w: number): number {
  const ratio = a.cover ? a.cover.height / a.cover.width : 1.1;
  return w * Math.min(1.4, Math.max(0.85, ratio));
}

function Cover({ album, width, height, large, onPress }: { album: Album; width: number; height: number; large?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const art = categoryArt(colors, album.category);
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${album.title}, ${album.photoCount} photos`} style={[styles.coverWrap, { width, height }]}>
      {album.cover ? (
        <Image source={{ uri: album.cover.thumbUrl }} style={[styles.fill, { backgroundColor: colors.surfaceAlt }]} resizeMode="cover" />
      ) : (
        <PatternArt kind={art.kind} bg={art.bg} fg={art.fg} style={styles.fill}>
          <View />
        </PatternArt>
      )}
      {/* A soft dark band keeps the label readable on any picture. */}
      <View style={[styles.label, large && styles.labelLarge, album.cover ? styles.labelOnPhoto : null]}>
        {large ? <Badge label="Latest album" tone="ink" icon={Images} /> : <View />}
        <View>
          <Text variant={large ? 'title1' : 'cardTitle'} color={album.cover ? PALETTE.paper : PALETTE.ink} numberOfLines={2}>
            {album.title}
          </Text>
          <Text variant="caption" color={album.cover ? PALETTE.paper : PALETTE.ink} style={styles.count}>
            {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  sectionHead: { marginTop: 32 },
  masonry: { flexDirection: 'row', gap: GAP, marginTop: 4 },
  coverWrap: { marginBottom: GAP, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  label: { flex: 1, padding: 14, justifyContent: 'space-between' },
  labelLarge: { padding: 20 },
  labelOnPhoto: { backgroundColor: 'rgba(20,35,29,0.32)' },
  count: { marginTop: 2, opacity: 0.85 },
});
