import React, { useEffect } from 'react';
import { FlatList, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BellOff, BellRing, CheckCheck } from 'lucide-react-native';

import { Button, Card, EmptyState, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { selectUnreadCount, useNotifications } from '../../store/notificationStore';
import { GUTTER, PALETTE, useTheme } from '../../theme';
import type { AppNotification } from '../../types/domain';
import { timeAgo } from '../../utils/time';
import { kindMeta } from './kind';

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

export function NotificationsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const items = useNotifications(s => s.items);
  const permission = useNotifications(s => s.permission);
  const unread = useNotifications(selectUnreadCount);
  const markAllRead = useNotifications(s => s.markAllRead);
  const markRead = useNotifications(s => s.markRead);
  const enable = useNotifications(s => s.enable);
  const refreshPermission = useNotifications(s => s.refreshPermission);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  const open = (n: AppNotification) => {
    markRead(n.id);
    if (n.postId) {
      navigation.navigate('PostDetail', { postId: n.postId });
    } else if (n.eventId) {
      navigation.navigate('EventDetail', { eventId: n.eventId });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title="Notifications"
        onBack={() => navigation.goBack()}
        right={
          unread > 0 ? (
            <PressableScale onPress={markAllRead} accessibilityRole="button" style={styles.markAll}>
              <CheckCheck size={18} color={colors.text} strokeWidth={2.3} />
              <Text variant="smallStrong" style={styles.markAllText}>
                Read all
              </Text>
            </PressableScale>
          ) : null
        }
      />

      <FlatList
        data={items}
        keyExtractor={n => n.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListHeaderComponent={
          <View>
            {permission !== 'granted' ? (
              <Card tone="sage" padding={18} style={styles.permission}>
                <View style={[styles.permIcon, { backgroundColor: colors.primary }]}>
                  {permission === 'denied' ? (
                    <BellOff size={22} color={PALETTE.ink} strokeWidth={2.2} />
                  ) : (
                    <BellRing size={22} color={PALETTE.ink} strokeWidth={2.2} />
                  )}
                </View>
                <Text variant="title3" style={styles.permTitle}>
                  {permission === 'denied' ? 'Notifications are off' : 'Never miss an alert'}
                </Text>
                <Text variant="body" color="textSecondary">
                  {permission === 'denied'
                    ? 'Turn them on in system settings to get urgent campus alerts and event reminders.'
                    : 'Get urgent alerts, class changes and event reminders the moment they happen.'}
                </Text>
                <View style={styles.permAction}>
                  <Button
                    title={permission === 'denied' ? 'Open settings' : 'Turn on notifications'}
                    size="md"
                    fullWidth={false}
                    onPress={() => (permission === 'denied' ? Linking.openSettings() : enable())}
                  />
                </View>
              </Card>
            ) : null}

          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={BellRing}
            title="You're all caught up"
            message="New alerts and updates from your university will appear here."
          />
        }
        renderItem={({ item, index }) => {
          const meta = kindMeta(item.kind, colors);
          const Icon = meta.icon;
          return (
            <PressableScale
              onPress={() => open(item)}
              scaleTo={0.99}
              accessibilityRole="button"
              style={[
                styles.row,
                index < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}>
              <View
                style={[
                  styles.kindIcon,
                  { backgroundColor: item.kind === 'alert' ? colors.coral : item.kind === 'society' ? colors.lavender : PALETTE.ink },
                ]}>
                <Icon size={18} color={item.kind === 'official' ? PALETTE.paper : PALETTE.ink} strokeWidth={2.3} />
              </View>
              <View style={styles.rowText}>
                <View style={styles.rowHead}>
                  <Text variant="cardTitle" numberOfLines={1} style={styles.rowTitle}>
                    {item.title}
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                <Text variant="small" color="textSecondary" numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
              {!item.read ? <View style={[styles.dot, { backgroundColor: colors.coral }]} /> : null}
            </PressableScale>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: GUTTER, paddingTop: 16, flexGrow: 1 },
  markAll: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, height: 42 },
  markAllText: { marginLeft: 6 },
  permission: { marginBottom: 16 },
  permIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  permTitle: { marginTop: 14, marginBottom: 6 },
  permAction: { marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16 },
  kindIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, marginLeft: 14 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  rowTitle: { flex: 1, marginRight: 10 },
  dot: { width: 9, height: 9, borderRadius: 5, marginLeft: 10, marginTop: 6 },
});
