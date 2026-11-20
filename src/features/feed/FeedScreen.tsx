import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Bookmark, Inbox, Pencil } from 'lucide-react-native';

import { Chip, EmptyState, PressableScale, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { sortFeed, useFeed } from '../../store/feedStore';
import { useSession } from '../../store/sessionStore';
import { GUTTER, PALETTE, useTheme } from '../../theme';
import { allowedPostKinds } from '../../types/domain';
import { KindFilter, KindTabs } from './KindTabs';
import { PostCard } from './PostCard';

type Props = NativeStackScreenProps<AppStackParamList, 'Feed'>;

export function FeedScreen({ navigation, route }: Props) {
  const savedOnly = !!route.params?.saved;
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const posts = useFeed(s => s.posts);
  const status = useFeed(s => s.status);
  const userState = useFeed(s => s.userState);
  const toggleLike = useFeed(s => s.toggleLike);
  const toggleBookmark = useFeed(s => s.toggleBookmark);
  const role = useSession(s => s.membership?.role);
  const university = useSession(s => s.university);

  const [kind, setKind] = useState<KindFilter>('all');
  const [channel, setChannel] = useState<string | null>(null);

  const canPost = !!role && allowedPostKinds(role).length > 0 && !savedOnly;

  const list = useMemo(
    () =>
      sortFeed(posts).filter(
        p =>
          (kind === 'all' || p.kind === kind) &&
          (channel === null || p.channel === channel) &&
          (!savedOnly || userState.bookmarked[p.id]),
      ),
    [posts, kind, channel, savedOnly, userState.bookmarked],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title={savedOnly ? 'Saved posts' : 'Campus updates'} onBack={() => navigation.goBack()} />

      <View style={styles.filters}>
        <KindTabs value={kind} onChange={setKind} />
        {!savedOnly && university && university.departments.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.channels}
            contentContainerStyle={styles.channelsContent}>
            <Chip label="All channels" selected={channel === null} onPress={() => setChannel(null)} />
            {university.departments.map(d => (
              <Chip key={d} label={d} selected={channel === d} onPress={() => setChannel(channel === d ? null : d)} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <FlatList
        data={status === 'loading' ? [] : list}
        keyExtractor={p => p.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (canPost ? 96 : 32) }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          status === 'loading' ? (
            <View style={styles.sep}>
              {[0, 1, 2].map(i => (
                <Skeleton key={i} height={170} radius={20} style={styles.skeleton} />
              ))}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          status === 'loading' ? undefined : (
            <EmptyState
              icon={savedOnly ? Bookmark : Inbox}
              title={savedOnly ? 'Nothing saved yet' : 'No updates here'}
              message={
                savedOnly
                  ? 'Tap the bookmark on any update to keep it here.'
                  : 'Try another filter, or check back later.'
              }
            />
          )
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            liked={!!userState.liked[item.id]}
            saved={!!userState.bookmarked[item.id]}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onLike={() => toggleLike(item.id)}
            onSave={() => toggleBookmark(item.id)}
          />
        )}
      />

      {canPost ? (
        <PressableScale
          onPress={() => navigation.navigate('Composer')}
          accessibilityRole="button"
          accessibilityLabel="New post"
          style={[
            styles.fab,
            { bottom: insets.bottom + 20, backgroundColor: colors.primary, borderRadius: radius.pill },
          ]}>
          <Pencil size={18} color={PALETTE.ink} strokeWidth={2.4} />
          <Text variant="button" color={PALETTE.ink} style={styles.fabText}>
            New post
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { paddingHorizontal: GUTTER, paddingTop: 10 },
  channels: { marginHorizontal: -GUTTER, marginTop: 6 },
  channelsContent: { paddingHorizontal: GUTTER, paddingVertical: 8, gap: 8 },
  list: { paddingHorizontal: GUTTER, paddingTop: 12, flexGrow: 1 },
  sep: { height: 12 },
  skeleton: { marginBottom: 12 },
  fab: {
    position: 'absolute',
    right: GUTTER,
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#14231D',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { marginLeft: 8 },
});
