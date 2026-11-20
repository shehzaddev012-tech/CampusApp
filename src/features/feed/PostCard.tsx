import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Bookmark, Heart, MessageCircle, Pin } from 'lucide-react-native';

import { Badge, PressableScale, Text } from '../../components/ui';
import { useTheme } from '../../theme';
import type { Post } from '../../types/domain';
import { compactNumber, timeAgo } from '../../utils/time';
import { kindMeta } from './kind';

interface Props {
  post: Post;
  liked: boolean;
  saved: boolean;
  onPress: () => void;
  onLike: () => void;
  onSave: () => void;
}

/** A full update in the feed. Alerts get a coral panel, everything else a bordered surface. */
export function PostCard({ post, liked, saved, onPress, onLike, onSave }: Props) {
  const { colors, radius } = useTheme();
  const meta = kindMeta(post.kind, colors);
  const KindIcon = meta.icon;
  const isAlert = post.kind === 'alert';

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="button"
      style={[
        styles.card,
        {
          borderRadius: radius.xl,
          backgroundColor: isAlert ? colors.accentSoft : colors.surface,
          borderColor: isAlert ? 'transparent' : colors.border,
        },
      ]}>
      <View style={styles.top}>
        <View style={styles.tag}>
          <KindIcon size={14} color={meta.textColor} strokeWidth={2.4} />
          <Text variant="overline" color={meta.textColor} style={styles.tagText}>
            {meta.label}
          </Text>
          {post.pinned ? (
            <View style={styles.pinned}>
              <Pin size={12} color={colors.textSecondary} strokeWidth={2.4} />
              <Text variant="caption" color="textSecondary" style={styles.pinnedText}>
                Pinned
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" color="textSecondary">
          {timeAgo(post.createdAt)}
        </Text>
      </View>

      <Text variant="title3" style={styles.title}>
        {post.title}
      </Text>
      <Text variant="body" color="textSecondary" numberOfLines={3}>
        {post.body}
      </Text>

      <View style={styles.byline}>
        <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.source}>
          {post.source}
        </Text>
        {post.channel ? <Badge label={post.channel} tone="neutral" /> : null}
      </View>

      <View style={[styles.footer, { borderTopColor: isAlert ? 'rgba(20,35,29,0.08)' : colors.border }]}>
        <PressableScale onPress={onLike} scaleTo={0.9} accessibilityLabel="Like" style={styles.action}>
          <Heart
            size={18}
            color={liked ? colors.coral : colors.textSecondary}
            fill={liked ? colors.coral : 'none'}
            strokeWidth={2.1}
          />
          <Text variant="smallStrong" color={liked ? colors.coral : 'textSecondary'} style={styles.count}>
            {compactNumber(post.likeCount)}
          </Text>
        </PressableScale>
        <View style={styles.action}>
          <MessageCircle size={18} color={colors.textSecondary} strokeWidth={2.1} />
          <Text variant="smallStrong" color="textSecondary" style={styles.count}>
            {compactNumber(post.commentCount)}
          </Text>
        </View>
        <View style={styles.spacer} />
        <PressableScale onPress={onSave} scaleTo={0.9} accessibilityLabel="Save post" style={styles.action}>
          <Bookmark
            size={18}
            color={saved ? colors.text : colors.textSecondary}
            fill={saved ? colors.text : 'none'}
            strokeWidth={2.1}
          />
        </PressableScale>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { flexDirection: 'row', alignItems: 'center' },
  tagText: { marginLeft: 6 },
  pinned: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  pinnedText: { marginLeft: 3 },
  title: { marginTop: 10, marginBottom: 4 },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  source: { flexShrink: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 18 },
  action: { flexDirection: 'row', alignItems: 'center' },
  count: { marginLeft: 6 },
  spacer: { flex: 1 },
});
