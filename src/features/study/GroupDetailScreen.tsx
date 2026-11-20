import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Flag, MapPin, MessageCircle, Trash2 } from 'lucide-react-native';

import { Avatar, Badge, Button, Card, IconButton, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import type { StudyGroupDetail } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { reportContent } from '../../utils/report';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupDetail'>;

export function GroupDetailScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [group, setGroup] = useState<StudyGroupDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroup(await backend.study.group(route.params.groupId));
    } catch {
      setMissing(true);
    }
  }, [route.params.groupId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const run = async (fn: () => Promise<void>, failTitle: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      show({ title: failTitle, body: e instanceof Error ? e.message : undefined, tone: 'alert' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!group || !(await confirm({ title: 'Leave this group?', message: 'You can join again later if there is room.', confirmLabel: 'Leave group' }))) {
      return;
    }
    await run(() => backend.study.leaveGroup(group.id), 'Could not leave');
  };

  const close = async () => {
    if (!group || !(await confirm({ title: 'Close this group?', message: 'No one else can join. Members stay in it.', confirmLabel: 'Close group', tone: 'neutral' }))) {
      return;
    }
    await run(() => backend.study.closeGroup(group.id), 'Could not close');
  };

  const remove = async () => {
    if (!group || !(await confirm({ title: 'Delete this group?', message: 'It is removed for all its members. This cannot be undone.', confirmLabel: 'Delete group' }))) {
      return;
    }
    try {
      await backend.study.removeGroup(group.id);
      navigation.goBack();
    } catch (e) {
      show({ title: 'Could not delete', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title="Study group"
        onBack={() => navigation.goBack()}
        right={group && !group.mine ? <IconButton icon={Flag} onPress={() => reportContent('study_group', group.id, 'group')} accessibilityLabel="Report" /> : group?.canManage ? <IconButton icon={Trash2} onPress={remove} accessibilityLabel="Delete" /> : undefined}
      />
      {!group ? (
        <View style={styles.pad}>{missing ? <Text variant="body" color="textSecondary">This group is no longer available.</Text> : <Skeleton height={160} radius={20} />}</View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.tags}>
            {group.course ? <Badge label={group.course} tone="info" /> : null}
            {group.status === 'closed' ? <Badge label="Closed" tone="neutral" /> : group.full ? <Badge label="Full" tone="warning" /> : <Badge label="Open" tone="success" />}
          </View>
          <Text variant="title2" style={styles.title}>
            {group.title}
          </Text>
          {group.meeting ? (
            <View style={styles.row}>
              <MapPin size={15} color={colors.textTertiary} />
              <Text variant="body" color="textSecondary" style={styles.rowText}>
                {group.meeting}
              </Text>
            </View>
          ) : null}
          {group.description ? (
            <Text variant="body" color="textSecondary" style={styles.desc}>
              {group.description}
            </Text>
          ) : null}

          <View style={styles.actions}>
            {group.joined ? (
              <View style={styles.chatBtn}>
                <Button
                  title="Open group chat"
                  variant="secondary"
                  icon={MessageCircle}
                  onPress={() =>
                    backend.chat
                      .room('group', group.id)
                      .then(r => navigation.navigate('Chat', { chatId: r.id, title: r.title, kind: 'group' }))
                      .catch(e => show({ title: 'Could not open the chat', body: e instanceof Error ? e.message : undefined, tone: 'alert' }))
                  }
                />
              </View>
            ) : null}
            {group.mine ? (
              group.status === 'open' ? <Button title="Close the group" variant="soft" onPress={close} loading={busy} /> : null
            ) : group.joined ? (
              <Button title="Leave group" variant="soft" onPress={leave} loading={busy} />
            ) : (
              <Button title={group.status === 'closed' ? 'Group is closed' : group.full ? 'Group is full' : 'Join the group'} disabled={group.status === 'closed' || group.full} loading={busy} onPress={() => run(() => backend.study.joinGroup(group.id), 'Could not join')} />
            )}
          </View>

          <Text variant="cardTitle" style={styles.h}>
            Members · {group.memberCount}
            {group.capacity ? ` of ${group.capacity}` : ''}
          </Text>
          {group.members.map(m => (
            <View key={m.uid} style={styles.memberWrap}>
              <Card padding={12}>
                <View style={styles.member}>
                  <Avatar name={m.name} size={36} />
                  <View style={styles.memberText}>
                    <Text variant="cardTitle" numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text variant="caption" color="textTertiary">
                      {m.department} · Batch {m.batch}
                    </Text>
                  </View>
                  {m.isCreator ? <Badge label="Started it" tone="ink" /> : null}
                </View>
              </Card>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: GUTTER },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
  tags: { flexDirection: 'row', gap: 8 },
  title: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  rowText: { marginLeft: 8, flex: 1 },
  desc: { marginTop: 14 },
  actions: { marginTop: 20 },
  chatBtn: { marginBottom: 10 },
  h: { marginTop: 26, marginBottom: 10 },
  memberWrap: { marginBottom: 8 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberText: { flex: 1 },
});
