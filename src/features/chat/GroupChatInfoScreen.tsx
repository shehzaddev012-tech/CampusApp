import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, LogOut, MoreVertical, Search, Trash2, UserPlus } from 'lucide-react-native';

import { Avatar, Badge, Button, Input, PressableScale, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import type { ChatGroupInfo, ChatGroupMember, Person } from '../../types/domain';
import { confirm } from '../../utils/confirm';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupChatInfo'>;

/** Members and settings of a group students made. Admins can rename it, add and remove people, and choose other admins. */
export function GroupChatInfoScreen({ navigation, route }: Props) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const { chatId } = route.params;
  const [info, setInfo] = useState<ChatGroupInfo | null>(null);
  const [gone, setGone] = useState(false);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Person[] | null>(null);

  const apply = useCallback((g: ChatGroupInfo) => {
    setInfo(g);
    setName(g.name);
    setAbout(g.about);
  }, []);

  const fail = (title: string, e: unknown) => show({ title, body: e instanceof ApiError ? e.message : undefined, tone: 'alert' });

  const load = useCallback(() => {
    backend.chat
      .groupInfo(chatId)
      .then(apply)
      .catch(e => {
        if (e instanceof ApiError && e.status === 404) {
          setGone(true); // removed from the group, or it was deleted
        }
      });
  }, [chatId, apply]);

  useEffect(load, [load]);
  useEffect(() => backend.chat.onNudge(id => id === chatId && load()), [chatId, load]);
  useEffect(() => {
    if (gone) {
      navigation.navigate('Chats');
    }
  }, [gone, navigation]);

  useEffect(() => {
    if (!adding || q.trim().length === 0) {
      setFound(null);
      return;
    }
    const t = setTimeout(() => {
      backend.chat
        .people(q.trim())
        .then(setFound)
        .catch(() => setFound([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, adding]);

  if (!info) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar title="Group info" onBack={() => navigation.goBack()} />
        <View style={styles.pad}>
          <Skeleton height={56} />
        </View>
      </View>
    );
  }

  const admin = info.myRole === 'admin';
  const inGroup = new Set(info.members.map(m => m.uid));
  const dirty = name.trim() !== info.name || about.trim() !== info.about;

  const save = async () => {
    if (name.trim().length < 2 || saving) {
      return;
    }
    setSaving(true);
    try {
      apply(await backend.chat.updateGroup(chatId, { name: name.trim(), about: about.trim() }));
      show({ title: 'Group updated', tone: 'success' });
    } catch (e) {
      fail('Could not save', e);
    } finally {
      setSaving(false);
    }
  };

  const toggleOnlyAdmins = async (v: boolean) => {
    try {
      apply(await backend.chat.updateGroup(chatId, { onlyAdminsPost: v }));
    } catch (e) {
      fail('Could not change this', e);
    }
  };

  const addPerson = async (p: Person) => {
    try {
      apply(await backend.chat.addGroupMembers(chatId, [p.uid]));
      setQ('');
      show({ title: `${p.name} added`, body: 'They will see messages from now on.', tone: 'success' });
    } catch (e) {
      fail('Could not add them', e);
    }
  };

  const memberMenu = (m: ChatGroupMember) => {
    if (!admin || m.isMe) {
      return;
    }
    const act = async (fn: () => Promise<unknown>, okTitle: string) => {
      try {
        await fn();
        load();
        show({ title: okTitle, tone: 'success' });
      } catch (e) {
        fail('That did not work', e);
      }
    };
    Alert.alert(m.name, undefined, [
      m.role === 'admin'
        ? { text: 'Remove as admin', onPress: () => void act(() => backend.chat.setGroupAdmin(chatId, m.uid, false), `${m.name} is no longer an admin`) }
        : { text: 'Make group admin', onPress: () => void act(() => backend.chat.setGroupAdmin(chatId, m.uid, true), `${m.name} is now an admin`) },
      {
        text: 'Remove from group',
        style: 'destructive',
        onPress: async () => {
          if (await confirm({ title: `Remove ${m.name}?`, message: 'They will no longer see this group.', confirmLabel: 'Remove' })) {
            await act(() => backend.chat.removeGroupMember(chatId, m.uid), `${m.name} removed`);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ], { cancelable: false });
  };

  const leave = async () => {
    if (!(await confirm({ title: 'Leave this group?', message: 'You will stop getting its messages. Someone has to add you again to rejoin.', confirmLabel: 'Leave' }))) {
      return;
    }
    try {
      await backend.chat.leaveGroup(chatId);
      navigation.navigate('Chats');
    } catch (e) {
      fail('Could not leave', e);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this group?', message: `"${info.name}" and all of its messages are deleted for everyone. This cannot be undone.`, confirmLabel: 'Delete group' }))) {
      return;
    }
    try {
      await backend.chat.deleteGroup(chatId);
      navigation.navigate('Chats');
    } catch (e) {
      fail('Could not delete', e);
    }
  };

  const header = (
    <View>
      <View style={styles.hero}>
        <Avatar name={info.name} size={72} />
        <Text variant="title3" style={styles.center}>
          {info.name}
        </Text>
        <Text variant="small" color="textSecondary">
          {info.members.length} {info.members.length === 1 ? 'person' : 'people'}
        </Text>
      </View>

      {admin ? (
        <View style={styles.block}>
          <Input label="Group name" value={name} onChangeText={setName} maxLength={60} />
          <View style={styles.gap}>
            <Input label="About" placeholder="What is this group for?" value={about} onChangeText={setAbout} maxLength={300} />
          </View>
          {dirty ? (
            <View style={styles.gap}>
              <Button title="Save changes" onPress={save} loading={saving} disabled={name.trim().length < 2} size="md" icon={Check} />
            </View>
          ) : null}
          <View style={[styles.switchRow, { borderColor: colors.border, borderRadius: radius.md }]}>
            <View style={styles.text}>
              <Text variant="smallStrong">Only admins can send messages</Text>
              <Text variant="caption" color="textTertiary">
                Good for announcements. Everyone can still read.
              </Text>
            </View>
            <Switch value={info.onlyAdminsPost} onValueChange={toggleOnlyAdmins} trackColor={{ true: colors.primary }} accessibilityLabel="Only admins can send messages" />
          </View>
        </View>
      ) : info.about ? (
        <View style={styles.block}>
          <Text variant="body" color="textSecondary">
            {info.about}
          </Text>
        </View>
      ) : null}

      {admin ? (
        <View style={styles.block}>
          <PressableScale onPress={() => setAdding(a => !a)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel="Add people" style={styles.actionRow}>
            <UserPlus size={20} color={colors.text} />
            <Text variant="smallStrong">{adding ? 'Done adding' : 'Add people'}</Text>
          </PressableScale>
          {adding ? (
            <View style={styles.gap}>
              <Input placeholder="Search a classmate by name" value={q} onChangeText={setQ} icon={Search} />
              {(found ?? []).map(p => (
                <PressableScale key={p.uid} onPress={() => (inGroup.has(p.uid) ? undefined : void addPerson(p))} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={inGroup.has(p.uid) ? `${p.name} is in the group` : `Add ${p.name}`} style={styles.rowWrap}>
                  <View style={styles.row}>
                    <Avatar name={p.name} uri={p.photoUrl} size={40} />
                    <View style={styles.text}>
                      <Text variant="cardTitle" numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text variant="caption" color="textTertiary">
                        {inGroup.has(p.uid) ? 'Already in the group' : `${p.department}`}
                      </Text>
                    </View>
                    {inGroup.has(p.uid) ? <Check size={18} color={colors.textTertiary} /> : <UserPlus size={18} color={colors.text} />}
                  </View>
                </PressableScale>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <Text variant="overline" color="textSecondary" style={styles.section}>
        MEMBERS
      </Text>
    </View>
  );

  const footer = (
    <View style={styles.block}>
      <Button title="Leave group" variant="secondary" icon={LogOut} onPress={leave} />
      {admin ? (
        <View style={styles.gap}>
          <Button title="Delete group" variant="danger" icon={Trash2} onPress={remove} />
        </View>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar title="Group info" onBack={() => navigation.goBack()} />
      <FlatList
        data={info.members}
        keyExtractor={m => m.uid}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        renderItem={({ item: m }) => (
          <PressableScale onPress={() => memberMenu(m)} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={m.isMe ? 'You' : m.name} style={[styles.rowWrap, styles.memberPad]}>
            <View style={styles.row}>
              <Avatar name={m.name} uri={m.photoUrl} size={44} />
              <View style={styles.text}>
                <Text variant="cardTitle" numberOfLines={1}>
                  {m.isMe ? 'You' : m.name}
                </Text>
              </View>
              {m.role === 'admin' ? <Badge label="Admin" tone="success" /> : null}
              {admin && !m.isMe ? <MoreVertical size={18} color={colors.textTertiary} /> : null}
            </View>
          </PressableScale>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: GUTTER },
  hero: { alignItems: 'center', gap: 6, paddingTop: 24, paddingBottom: 12 },
  center: { textAlign: 'center' },
  block: { paddingHorizontal: GUTTER, marginTop: 16 },
  gap: { marginTop: 12 },
  section: { paddingHorizontal: GUTTER, marginTop: 24, marginBottom: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, marginTop: 16 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  rowWrap: { paddingVertical: 8 },
  memberPad: { paddingHorizontal: GUTTER },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  text: { flex: 1 },
});
