import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MessageCircle, SquarePen } from 'lucide-react-native';

import { Avatar, Badge, EmptyState, IconButton, PressableScale, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { GUTTER, useTheme } from '../../theme';
import type { ChatSummary } from '../../types/domain';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'Chats'>;

const KIND: Record<ChatSummary['kind'], string> = { dm: '', society: 'Society', group: 'Study group' };

export function ChatsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<ChatSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const load = () =>
        backend.chat
          .list()
          .then(c => alive && setChats(c))
          .catch(() => alive && setChats(prev => prev ?? []));
      load();
      const t = setInterval(load, 8000);
      return () => {
        alive = false;
        clearInterval(t);
      };
    }, []),
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Messages" onBack={() => navigation.goBack()} right={<IconButton icon={SquarePen} onPress={() => navigation.navigate('NewChat')} accessibilityLabel="New message" />} />
      <FlatList
        data={chats ?? []}
        keyExtractor={c => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListEmptyComponent={
          chats === null ? (
            <Skeleton height={72} radius={16} />
          ) : (
            <EmptyState icon={MessageCircle} title="No conversations yet" message="Message a classmate, or join a society or study group to chat with its members." actionLabel="New message" onAction={() => navigation.navigate('NewChat')} />
          )
        }
        renderItem={({ item: c }) => (
          <PressableScale onPress={() => navigation.navigate('Chat', { chatId: c.id, title: c.title, kind: c.kind, otherUserId: c.otherUserId ?? undefined })} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={c.title} style={styles.rowWrap}>
            <View style={styles.row}>
              <Avatar name={c.title} size={48} />
              <View style={styles.text}>
                <View style={styles.top}>
                  <Text variant="cardTitle" numberOfLines={1} style={styles.title}>
                    {c.title}
                  </Text>
                  {c.lastMessage ? (
                    <Text variant="caption" color="textTertiary">
                      {timeAgo(c.lastMessage.at)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.top}>
                  <Text variant="small" color={c.unread ? 'text' : 'textSecondary'} numberOfLines={1} style={styles.title}>
                    {c.lastMessage ? `${c.kind !== 'dm' && c.lastMessage.sender ? `${c.lastMessage.sender.split(' ')[0]}: ` : ''}${c.lastMessage.body}` : KIND[c.kind] || 'Say hello'}
                  </Text>
                  {c.unread ? <Badge label={String(c.unread)} tone="primary" /> : null}
                </View>
              </View>
            </View>
          </PressableScale>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: GUTTER, paddingTop: 8, flexGrow: 1 },
  rowWrap: { paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  text: { flex: 1, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1 },
});
