import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowUp, Bookmark, Eye, Heart, MessageCircle, SearchX, Trash2 } from 'lucide-react-native';

import { Avatar, Badge, EmptyState, IconButton, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useFeed, watchComments } from '../../store/feedStore';
import { useSession } from '../../store/sessionStore';
import { GUTTER, PALETTE, useTheme } from '../../theme';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { PostComment, ROLE_LABEL } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { compactNumber, timeAgo } from '../../utils/time';
import { kindMeta } from './kind';

type Props = NativeStackScreenProps<AppStackParamList, 'PostDetail'>;

export function PostDetailScreen({ navigation, route }: Props) {
  const { postId } = route.params;
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const post = useFeed(s => s.posts.find(p => p.id === postId));
  const userState = useFeed(s => s.userState);
  const toggleLike = useFeed(s => s.toggleLike);
  const toggleBookmark = useFeed(s => s.toggleBookmark);
  const addComment = useFeed(s => s.addComment);
  const membership = useSession(s => s.membership);

  const [comments, setComments] = useState<PostComment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    useFeed.getState().markRead(postId);
    return watchComments(postId, setComments);
  }, [postId]);

  if (!post) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar onBack={() => navigation.goBack()} />
        <EmptyState icon={SearchX} title="Update not found" message="It may have been removed by an admin." />
      </View>
    );
  }

  const meta = kindMeta(post.kind, colors);
  const liked = !!userState.liked[post.id];
  const saved = !!userState.bookmarked[post.id];
  const isAdmin = membership?.role === 'uni_admin' || membership?.role === 'dept_admin';
  const canSend = text.trim().length > 0 && !sending;
  const canDeletePost = isAdmin || post.authorId === membership?.uid;

  const deletePost = async () => {
    if (!(await confirm({ title: 'Delete this update?', message: 'It is removed for everyone, together with its comments. This cannot be undone.', confirmLabel: 'Delete update' }))) {
      return;
    }
    try {
      await backend.posts.deletePost(post.id);
      useToast.getState().show({ title: 'Update deleted', tone: 'success' });
      navigation.goBack();
    } catch (e) {
      useToast.getState().show({ title: 'Could not delete', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  const deleteComment = async (c: PostComment) => {
    if (!(await confirm({ title: 'Delete this comment?', message: 'This cannot be undone.', confirmLabel: 'Delete comment' }))) {
      return;
    }
    try {
      await backend.posts.deleteComment(post.id, c.id);
    } catch (e) {
      useToast.getState().show({ title: 'Could not delete', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  const send = async () => {
    if (!canSend) {
      return;
    }
    setSending(true);
    const ok = await addComment(post.id, text);
    setSending(false);
    if (ok) {
      setText('');
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TopBar
        onBack={() => navigation.goBack()}
        title={meta.name}
        right={
          <View style={styles.topActions}>
            {canDeletePost ? <IconButton icon={Trash2} onPress={deletePost} accessibilityLabel="Delete update" /> : null}
            <IconButton icon={Bookmark} onPress={() => toggleBookmark(post.id)} accessibilityLabel={saved ? 'Remove from saved' : 'Save post'} />
          </View>
        }
      />

      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.badges}>
          <Badge
            label={meta.name}
            tone={post.kind === 'alert' ? 'coral' : post.kind === 'society' ? 'lavender' : 'ink'}
            icon={meta.icon}
          />
          {post.pinned ? <Badge label="Pinned" tone="neutral" /> : null}
          {post.channel ? <Badge label={post.channel} tone="neutral" /> : null}
        </View>

        <Text variant="title1" style={styles.title}>
          {post.title}
        </Text>

        <View style={styles.author}>
          <Avatar name={post.source} size={40} square />
          <View style={styles.authorText}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {post.source}
            </Text>
            <Text variant="caption" color="textSecondary">
              {ROLE_LABEL[post.authorRole]} · {timeAgo(post.createdAt)}
            </Text>
          </View>
        </View>

        <Text variant="bodyLg" style={styles.body}>
          {post.body}
        </Text>

        <View style={[styles.actions, { borderColor: colors.border }]}>
          <PressableScale
            onPress={() => toggleLike(post.id)}
            scaleTo={0.94}
            accessibilityLabel="Like"
            style={[styles.pill, { backgroundColor: liked ? colors.accentSoft : colors.surfaceAlt }]}>
            <Heart
              size={18}
              color={liked ? colors.coral : colors.text}
              fill={liked ? colors.coral : 'none'}
              strokeWidth={2.1}
            />
            <Text variant="smallStrong" color={liked ? colors.coral : 'text'} style={styles.pillText}>
              {compactNumber(post.likeCount)}
            </Text>
          </PressableScale>
          <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
            <MessageCircle size={18} color={colors.text} strokeWidth={2.1} />
            <Text variant="smallStrong" style={styles.pillText}>
              {compactNumber(post.commentCount)}
            </Text>
          </View>
          {isAdmin ? (
            <View style={styles.seen}>
              <Eye size={16} color={colors.textSecondary} strokeWidth={2.1} />
              <Text variant="caption" color="textSecondary" style={styles.pillText}>
                Seen by {compactNumber(post.readCount)}
              </Text>
            </View>
          ) : null}
        </View>

        <Text variant="title3" style={styles.commentsTitle}>
          Comments{comments.length > 0 ? ` (${comments.length})` : ''}
        </Text>
        {comments.length === 0 ? (
          <Text variant="body" color="textSecondary">
            No comments yet. Start the conversation.
          </Text>
        ) : (
          comments.map(c => (
            <View key={c.id} style={styles.comment}>
              <Avatar name={c.authorName} size={34} />
              <View style={styles.commentBody}>
                <View style={styles.commentHead}>
                  <Text variant="smallStrong" numberOfLines={1} style={styles.commentName}>
                    {c.authorName}
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {timeAgo(c.createdAt)}
                  </Text>
                  {isAdmin || c.authorId === membership?.uid ? (
                    <PressableScale onPress={() => deleteComment(c)} accessibilityRole="button" accessibilityLabel="Delete comment" hitSlop={10} style={styles.commentDelete}>
                      <Trash2 size={14} color={colors.textTertiary} strokeWidth={2.1} />
                    </PressableScale>
                  ) : null}
                </View>
                <Text variant="body">{c.text}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View
        style={[
          styles.composer,
          { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 10 },
        ]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a comment"
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.text}
          maxLength={500}
          multiline
          style={[typography.body, styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
        />
        <PressableScale
          onPress={send}
          disabled={!canSend}
          accessibilityLabel="Send comment"
          style={[styles.send, { backgroundColor: canSend ? colors.primary : colors.surfaceAlt }]}>
          <ArrowUp size={20} color={canSend ? PALETTE.ink : colors.textTertiary} strokeWidth={2.6} />
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topActions: { flexDirection: 'row', gap: 8 },
  commentDelete: { marginLeft: 10, padding: 2 },
  content: { paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 32 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { marginTop: 14 },
  author: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  authorText: { marginLeft: 12, flex: 1 },
  body: { marginTop: 22 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 26,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pill: { flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: 16, borderRadius: 20 },
  pillText: { marginLeft: 7 },
  seen: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  commentsTitle: { marginTop: 34, marginBottom: 14 },
  comment: { flexDirection: 'row', marginBottom: 18 },
  commentBody: { flex: 1, marginLeft: 12 },
  commentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  commentName: { flex: 1, marginRight: 8 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: GUTTER,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, maxHeight: 110, minHeight: 44, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
