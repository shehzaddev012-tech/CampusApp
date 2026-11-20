import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MapPin, PackageSearch, Plus } from 'lucide-react-native';

import { Badge, Button, Card, Chip, EmptyState, IconButton, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import type { LostItem } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'LostFound'>;

export function LostFoundScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [status, setStatus] = useState<'open' | 'resolved'>('open');
  const [items, setItems] = useState<LostItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await backend.lostFound.list(status));
    } catch {
      setItems(prev => prev ?? []);
    }
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const fail = (title: string, e: unknown) => show({ title, body: e instanceof Error ? e.message : undefined, tone: 'alert' });

  const reply = async (i: LostItem) => {
    const lost = i.kind === 'lost';
    if (
      !(await confirm({
        title: lost ? 'Tell them you found it?' : 'Tell them this is yours?',
        message: `${i.postedBy} gets a notification and can see your name and department.`,
        confirmLabel: lost ? 'Yes, I found it' : 'Yes, it is mine',
        tone: 'neutral',
      }))
    ) {
      return;
    }
    try {
      await backend.lostFound.reply(i.id);
      show({ title: 'They have been told', body: 'They will contact you.', tone: 'success' });
      load();
    } catch (e) {
      fail('Could not send', e);
    }
  };

  const resolve = async (i: LostItem) => {
    if (!(await confirm({ title: i.kind === 'lost' ? 'Got it back?' : 'Returned to the owner?', message: 'The post is closed and moves to Resolved.', confirmLabel: 'Mark as resolved', tone: 'neutral' }))) {
      return;
    }
    try {
      await backend.lostFound.resolve(i.id);
      load();
    } catch (e) {
      fail('Could not update', e);
    }
  };

  const remove = async (i: LostItem) => {
    if (!(await confirm({ title: 'Delete this post?', message: 'It is removed for everyone. This cannot be undone.', confirmLabel: 'Delete post' }))) {
      return;
    }
    try {
      await backend.lostFound.remove(i.id);
      load();
    } catch (e) {
      fail('Could not delete', e);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Lost & Found" onBack={() => navigation.goBack()} right={<IconButton icon={Plus} onPress={() => navigation.navigate('LostItemForm')} accessibilityLabel="Post an item" />} />
      <View style={styles.filters}>
        <Chip label="Open" selected={status === 'open'} onPress={() => { setItems(null); setStatus('open'); }} />
        <Chip label="Resolved" selected={status === 'resolved'} onPress={() => { setItems(null); setStatus('resolved'); }} />
      </View>

      <FlatList
        data={items ?? []}
        keyExtractor={i => i.id}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          items === null ? (
            <Skeleton height={140} radius={20} />
          ) : (
            <EmptyState
              icon={PackageSearch}
              title={status === 'open' ? 'Nothing lost or found' : 'Nothing resolved yet'}
              message={status === 'open' ? 'Lost something, or found something? Post it so the right person sees it.' : 'Closed posts show up here.'}
              actionLabel={status === 'open' ? 'Post an item' : undefined}
              onAction={status === 'open' ? () => navigation.navigate('LostItemForm') : undefined}
            />
          )
        }
        renderItem={({ item: i }) => (
          <Card padding={16}>
            <View style={styles.head}>
              <Badge label={i.kind === 'lost' ? 'Lost' : 'Found'} tone={i.kind === 'lost' ? 'coral' : 'primary'} />
              <Text variant="caption" color="textTertiary">
                {timeAgo(i.createdAt)}
              </Text>
            </View>
            <Text variant="title3" style={styles.title}>
              {i.title}
            </Text>
            {i.place ? (
              <View style={styles.place}>
                <MapPin size={14} color={colors.textTertiary} />
                <Text variant="small" color="textSecondary" style={styles.placeText}>
                  {i.place}
                </Text>
              </View>
            ) : null}
            {i.description ? (
              <Text variant="body" color="textSecondary" style={styles.desc}>
                {i.description}
              </Text>
            ) : null}
            <Text variant="caption" color="textTertiary" style={styles.by}>
              Posted by {i.mine ? 'you' : i.postedBy}
            </Text>

            {i.status === 'open' ? (
              i.mine ? (
                <View style={styles.actions}>
                  <View style={styles.flex}>
                    <Button
                      title={i.replies ? `${i.replies} ${i.replies === 1 ? 'reply' : 'replies'}` : 'No replies yet'}
                      size="md"
                      variant="soft"
                      disabled={!i.replies}
                      onPress={() => navigation.navigate('LostReplies', { itemId: i.id, title: i.title })}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Button title="Resolved" size="md" onPress={() => resolve(i)} />
                  </View>
                </View>
              ) : (
                <View style={styles.actions}>
                  <View style={styles.flex}>
                    <Button
                      title={i.iReplied ? 'You replied' : i.kind === 'lost' ? 'I found it' : 'This is mine'}
                      size="md"
                      variant={i.iReplied ? 'soft' : 'primary'}
                      disabled={i.iReplied}
                      onPress={() => reply(i)}
                    />
                  </View>
                  {i.canManage ? <Button title="Delete" size="md" variant="danger" fullWidth={false} onPress={() => remove(i)} /> : null}
                </View>
              )
            ) : null}
            {i.mine && i.status === 'open' ? (
              <View style={styles.deleteRow}>
                <Button title="Delete post" size="md" variant="ghost" onPress={() => remove(i)} />
              </View>
            ) : null}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: GUTTER, paddingTop: 12 },
  list: { paddingHorizontal: GUTTER, paddingTop: 16, flexGrow: 1 },
  sep: { height: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: 10 },
  place: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  placeText: { marginLeft: 5 },
  desc: { marginTop: 10 },
  by: { marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  deleteRow: { marginTop: 4 },
  flex: { flex: 1 },
});
