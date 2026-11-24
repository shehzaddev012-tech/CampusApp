import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MessageCircle, MessageSquarePlus, Search, X } from 'lucide-react-native';

import { Avatar, EmptyState, PressableScale, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { GUTTER, useTheme } from '../../theme';
import type { ChatSummary } from '../../types/domain';
import { listTime } from '../../utils/chatTime';
import { useChatColors } from './ChatParts';

type Props = NativeStackScreenProps<AppStackParamList, 'Chats'>;

const KIND: Record<ChatSummary['kind'], string> = { dm: '', society: 'Society', group: 'Study group', custom: 'Group' };
type Filter = 'all' | 'unread' | 'groups';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'groups', label: 'Groups' },
];

/** The list of chats, in the WhatsApp way: search, All / Unread / Groups, a time and a green count on each row, and a button for a new chat. */
export function ChatsScreen({ navigation }: Props) {
  const { colors, typography, shadow } = useTheme();
  // search box and filter chips use the app's own soft surface, not a chat-only colour
  const chat = useChatColors();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const load = () =>
        backend.chat
          .list()
          .then(c => alive && setChats(c))
          .catch(() => alive && setChats(prev => prev ?? []));
      load();
      const unsubscribe = backend.chat.onNudge(() => void load()); // a new message anywhere: refresh the list now
      let ticks = 0;
      const t = setInterval(() => {
        ticks += 1;
        if (!backend.chat.isLive() || ticks % 4 === 0) {
          void load();
        }
      }, 8000);
      return () => {
        alive = false;
        unsubscribe();
        clearInterval(t);
      };
    }, []),
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (chats ?? []).filter(c => {
      if (filter === 'unread' && c.unread === 0) {
        return false;
      }
      if (filter === 'groups' && c.kind === 'dm') {
        return false;
      }
      return q === '' || c.title.toLowerCase().includes(q);
    });
  }, [chats, query, filter]);

  const unreadTotal = (chats ?? []).filter(c => c.unread > 0).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Messages" onBack={() => navigation.goBack()} />
      <View style={styles.searchWrap}>
        <View style={[styles.search, { backgroundColor: colors.surfaceAlt }]}>
          <Search size={20} color={chat.icon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search chats"
            placeholderTextColor={chat.meta}
            returnKeyType="search"
            style={[styles.searchInput, typography.body, { color: colors.text }]}
            accessibilityLabel="Search chats"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <X size={18} color={chat.icon} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.chips}>
          {FILTERS.map(f => {
            const on = filter === f.id;
            return (
              <PressableScale
                key={f.id}
                onPress={() => setFilter(f.id)}
                scaleTo={0.96}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.chip, { backgroundColor: on ? colors.primary : colors.surfaceAlt }]}>
                <Text variant="smallStrong" style={{ color: on ? colors.onPrimary : colors.textSecondary }}>
                  {f.label}
                  {f.id === 'unread' && unreadTotal > 0 ? ` ${unreadTotal}` : ''}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <FlatList
        data={shown}
        keyExtractor={c => c.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        ListEmptyComponent={
          chats === null ? (
            <Skeleton height={72} radius={16} />
          ) : query || filter !== 'all' ? (
            <EmptyState icon={Search} title="Nothing here" message={query ? 'No chat matches your search.' : filter === 'unread' ? 'You have read everything.' : 'You are not in any group yet.'} />
          ) : (
            <EmptyState icon={MessageCircle} title="No conversations yet" message="Message a classmate, or join a society or study group to chat with its members." actionLabel="New message" onAction={() => navigation.navigate('NewChat')} />
          )
        }
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        renderItem={({ item: c }) => {
          const unread = c.unread > 0;
          const preview = c.lastMessage ? `${c.kind !== 'dm' && c.lastMessage.sender ? `${c.lastMessage.sender.split(' ')[0]}: ` : ''}${c.lastMessage.body}` : KIND[c.kind] || 'Say hello';
          return (
            <PressableScale
              onPress={() => navigation.navigate('Chat', { chatId: c.id, title: c.title, kind: c.kind, otherUserId: c.otherUserId ?? undefined, photoUrl: c.otherPhotoUrl, targetId: c.targetId })}
              scaleTo={0.985}
              accessibilityRole="button"
              accessibilityLabel={`${c.title}${unread ? `, ${c.unread} unread` : ''}. ${preview}`}
              style={styles.row}>
              <Avatar name={c.title} uri={c.otherPhotoUrl} size={52} />
              <View style={styles.text}>
                <View style={styles.line}>
                  <Text variant="cardTitle" numberOfLines={1} style={styles.title}>
                    {c.title}
                  </Text>
                  {c.lastMessage ? (
                    <Text variant="caption" style={{ color: unread ? colors.text : chat.meta, fontWeight: unread ? '700' : '400' }}>
                      {listTime(c.lastMessage.at)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.line}>
                  <Text variant="small" numberOfLines={1} style={[styles.title, { color: unread ? colors.text : chat.meta, fontWeight: unread ? '600' : '400' }]}>
                    {preview}
                  </Text>
                  {unread ? (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Text variant="caption" style={[styles.badgeText, { color: colors.onPrimary }]}>
                        {c.unread > 99 ? '99+' : c.unread}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </PressableScale>
          );
        }}
      />

      <PressableScale
        onPress={() => navigation.navigate('NewChat')}
        scaleTo={0.93}
        accessibilityRole="button"
        accessibilityLabel="New message"
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }, shadow(3)]}>
        <MessageSquarePlus size={26} color={colors.onPrimary} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { paddingHorizontal: GUTTER, paddingTop: 12, gap: 10 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 26, paddingHorizontal: 16, minHeight: 46 },
  searchInput: { flex: 1, paddingVertical: 8 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, minHeight: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: GUTTER, paddingTop: 6, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
  text: { flex: 1, gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontWeight: '700' },
  fab: { position: 'absolute', right: 20, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
});

