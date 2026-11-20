import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MessageCircle } from 'lucide-react-native';

import { Avatar, EmptyState, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { GUTTER, useTheme } from '../../theme';
import type { LostReply } from '../../types/domain';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'LostReplies'>;

/** Who replied to my lost-and-found post, so I can find them. */
export function LostRepliesScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [replies, setReplies] = useState<LostReply[] | null>(null);

  useEffect(() => {
    backend.lostFound
      .replies(route.params.itemId)
      .then(setReplies)
      .catch(() => setReplies([]));
  }, [route.params.itemId]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Replies" onBack={() => navigation.goBack()} />
      <FlatList
        data={replies ?? []}
        keyExtractor={r => r.uid}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={
          <Text variant="body" color="textSecondary" style={styles.intro}>
            People who replied about "{route.params.title}". Find them on campus, or ask a friend in their department.
          </Text>
        }
        ListEmptyComponent={<EmptyState icon={MessageCircle} title={replies === null ? 'Loading…' : 'No replies yet'} message="You will get a notification when someone replies." />}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderColor: colors.border }]}>
            <Avatar name={item.name} size={44} />
            <View style={styles.text}>
              <Text variant="bodyStrong">{item.name}</Text>
              <Text variant="small" color="textSecondary">
                {item.department} · Batch {item.batch}
              </Text>
            </View>
            <Text variant="caption" color="textTertiary">
              {timeAgo(item.createdAt)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: GUTTER, paddingTop: 14, flexGrow: 1 },
  intro: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  text: { flex: 1, marginLeft: 12 },
});
