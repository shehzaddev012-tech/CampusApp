import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

import { PressableScale, Text } from '../../components/ui';
import { useTheme } from '../../theme';
import type { Post } from '../../types/domain';
import { timeAgo } from '../../utils/time';
import { kindMeta } from '../feed/kind';

/**
 * A compact update for the Home feed. Official, society and alert updates each look
 * different, so students can tell at a glance who is speaking:
 *   official  ink marker + verified tick
 *   society   lavender marker
 *   alert     coral tinted panel
 */
export function UpdateRow({ post, last, onPress }: { post: Post; last?: boolean; onPress: () => void }) {
  const { colors, radius } = useTheme();
  const meta = kindMeta(post.kind, colors);
  const Icon = meta.icon;

  if (post.kind === 'alert') {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.99}
        style={[styles.alert, { backgroundColor: colors.accentSoft, borderRadius: radius.lg }]}>
        <TriangleAlert size={22} color={colors.coralText} strokeWidth={2.2} />
        <View style={styles.alertBody}>
          <View style={styles.topRow}>
            <Text variant="overline" color={colors.coralText}>
              ALERT
            </Text>
            <Text variant="caption" color="textSecondary">
              {timeAgo(post.createdAt)}
            </Text>
          </View>
          <Text variant="cardTitle" style={styles.title}>
            {post.title}
          </Text>
          <Text variant="small" color="textSecondary" numberOfLines={2}>
            {post.body}
          </Text>
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}>
      <View style={[styles.marker, { backgroundColor: meta.color }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.tag}>
            <Icon size={14} color={meta.textColor} strokeWidth={2.4} />
            <Text variant="overline" color={meta.textColor} style={styles.tagText}>
              {meta.label}
            </Text>
          </View>
          <Text variant="caption" color="textSecondary">
            {timeAgo(post.createdAt)}
          </Text>
        </View>
        <Text variant="cardTitle" style={styles.title}>
          {post.title}
        </Text>
        <Text variant="small" color="textSecondary" numberOfLines={2}>
          {post.body}
        </Text>
        <Text variant="caption" color="textTertiary" style={styles.author}>
          {post.source}
          {post.pinned ? '  ·  Pinned' : ''}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 16 },
  marker: { width: 4, borderRadius: 2, marginRight: 14 },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center' },
  tagText: { marginLeft: 5 },
  title: { marginTop: 6, marginBottom: 3 },
  author: { marginTop: 8 },
  alert: { flexDirection: 'row', padding: 16, marginVertical: 10 },
  alertBody: { flex: 1, marginLeft: 12 },
});
