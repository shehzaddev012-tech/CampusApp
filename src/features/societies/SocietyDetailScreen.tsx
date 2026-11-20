import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, MessageCircle, Megaphone, Pencil, Plus, SearchX, Trash2, UserPlus, Users } from 'lucide-react-native';

import { Avatar, Badge, Button, Card, EmptyState, PatternArt, SectionHeader, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useSession } from '../../store/sessionStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, PALETTE, useTheme } from '../../theme';
import type { SocietyDetail, SocietyMember } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { timeAgo } from '../../utils/time';
import { categoryArt } from '../events/eventArt';
import { EventRow } from '../events/EventCard';

type Props = NativeStackScreenProps<AppStackParamList, 'SocietyDetail'>;

export function SocietyDetailScreen({ navigation, route }: Props) {
  const { societyId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const role = useSession(s => s.membership?.role);
  const isAdmin = role === 'uni_admin' || role === 'dept_admin';
  const show = useToast(s => s.show);

  const [society, setSociety] = useState<SocietyDetail | null>(null);
  const [members, setMembers] = useState<SocietyMember[]>([]);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detail, list] = await Promise.all([backend.societies.get(societyId), backend.societies.members(societyId)]);
      setSociety(detail);
      setMembers(list);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setMissing(true);
      }
    }
  }, [societyId]);

  // Reload whenever the screen comes back into view (after editing, adding a head, ...).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const act = async (fn: () => Promise<unknown>, failTitle: string) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      show({ title: failTitle, body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    } finally {
      setBusy(false);
    }
  };

  if (missing) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar onBack={() => navigation.goBack()} />
        <EmptyState icon={SearchX} title="Society not found" message="It may have been removed by an admin." />
      </View>
    );
  }

  const art = society ? categoryArt(colors, society.category) : null;
  const iAmHead = society?.myRole === 'head';
  const canManage = iAmHead || isAdmin;

  const confirmDelete = async () => {
    if (!(await confirm({ title: 'Delete this society?', message: 'Its members are removed. Updates, events and photos stay, but no longer belong to it.', confirmLabel: 'Delete society' }))) {
      return;
    }
    try {
      await backend.societies.remove(societyId);
      navigation.goBack();
    } catch (e) {
      show({ title: 'Could not delete', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  const confirmRemoveHead = async (uid: string, name: string) => {
    if (await confirm({ title: `Remove ${name} as head?`, message: 'They stay a member of the society.', confirmLabel: 'Remove' })) {
      act(() => backend.societies.removeHead(societyId, uid), 'Could not remove the head');
    }
  };

  const toggleMembership = async () => {
    if (!society) {
      return;
    }
    if (society.joined && !(await confirm({ title: `Leave ${society.name}?`, message: 'You will stop seeing its members-only updates. You can join again any time.', confirmLabel: 'Leave' }))) {
      return;
    }
    act(() => (society.joined ? backend.societies.leave(societyId) : backend.societies.join(societyId)), society.joined ? 'Could not leave' : 'Could not join');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar onBack={() => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {!society || !art ? (
          <View>
            <Skeleton height={150} radius={28} />
            <Skeleton height={28} width="70%" style={styles.skel} />
            <Skeleton height={60} style={styles.skel} />
          </View>
        ) : (
          <>
            <PatternArt kind={art.kind} bg={art.bg} fg={art.fg} style={styles.art}>
              <Badge label={society.category} tone="ink" />
            </PatternArt>

            <Text variant="title1" style={styles.title}>
              {society.name}
            </Text>
            <View style={styles.stats}>
              <Users size={15} color={colors.textTertiary} />
              <Text variant="small" color="textSecondary" style={styles.statText}>
                {society.memberCount} {society.memberCount === 1 ? 'member' : 'members'}
              </Text>
              {society.myRole === 'head' ? <Badge label="You lead this society" tone="primary" /> : null}
            </View>
            {society.about ? (
              <Text variant="bodyLg" color="textSecondary" style={styles.about}>
                {society.about}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <Button
                title={society.joined ? 'Joined' : 'Join this society'}
                variant={society.joined ? 'soft' : 'primary'}
                icon={society.joined ? Check : Plus}
                loading={busy}
                disabled={iAmHead}
                onPress={toggleMembership}
              />
              {society.joined ? (
                <View style={styles.chatBtn}>
                  <Button
                    title="Open chat"
                    variant="secondary"
                    icon={MessageCircle}
                    onPress={() =>
                      backend.chat
                        .room('society', societyId)
                        .then(r => navigation.navigate('Chat', { chatId: r.id, title: r.title, kind: 'society' }))
                        .catch(e => show({ title: 'Could not open the chat', body: e instanceof Error ? e.message : undefined, tone: 'alert' }))
                    }
                  />
                </View>
              ) : null}
              {society.joined && !iAmHead ? (
                <Text variant="caption" color="textTertiary" align="center" style={styles.leaveHint}>
                  Tap again to leave.
                </Text>
              ) : null}
            </View>

            {canManage ? (
              <Card padding={14} tone="sage" style={styles.manage}>
                <Text variant="smallStrong" style={styles.manageTitle}>
                  Manage
                </Text>
                <View style={styles.manageRow}>
                  <Button title="Edit" size="md" variant="secondary" icon={Pencil} fullWidth={false} onPress={() => navigation.navigate('SocietyForm', { societyId })} />
                  {iAmHead || isAdmin ? <Button title="Post update" size="md" variant="soft" icon={Megaphone} fullWidth={false} onPress={() => navigation.navigate('Composer')} /> : null}
                </View>
                {isAdmin ? (
                  <View style={styles.manageRow}>
                    <Button title="Add a head" size="md" variant="soft" icon={UserPlus} fullWidth={false} onPress={() => navigation.navigate('MemberPicker', { societyId })} />
                    <Button title="Delete" size="md" variant="danger" icon={Trash2} fullWidth={false} onPress={confirmDelete} />
                  </View>
                ) : null}
              </Card>
            ) : null}

            <View style={styles.block}>
              <SectionHeader title={society.heads.length > 1 ? 'Heads' : 'Head'} />
              {society.heads.length === 0 ? (
                <Text variant="body" color="textSecondary">
                  No head has been chosen yet.
                </Text>
              ) : (
                society.heads.map(h => (
                  <View key={h.uid} style={styles.personRow}>
                    <Avatar name={h.name} uri={h.photoUrl} size={40} />
                    <Text variant="bodyStrong" style={styles.personName}>
                      {h.name}
                    </Text>
                    {isAdmin ? (
                      <Pressable accessibilityRole="button" hitSlop={10} onPress={() => confirmRemoveHead(h.uid, h.name)}>
                        <Text variant="smallStrong" color="danger">
                          Remove
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))
              )}
            </View>

            <View style={styles.block}>
              <SectionHeader title="Upcoming events" />
              {society.upcomingEvents.length === 0 ? (
                <Text variant="body" color="textSecondary">
                  No event is planned right now.
                </Text>
              ) : (
                society.upcomingEvents.map((e, i) => <EventRow key={e.id} event={e} last={i === society.upcomingEvents.length - 1} />)
              )}
            </View>

            <View style={styles.block}>
              <SectionHeader title="Recent updates" />
              {society.recentPosts.length === 0 ? (
                <Text variant="body" color="textSecondary">
                  Nothing posted yet.
                </Text>
              ) : (
                society.recentPosts.map(p => (
                  <Pressable key={p.id} accessibilityRole="button" onPress={() => navigation.navigate('PostDetail', { postId: p.id })} style={[styles.postRow, { borderColor: colors.border }]}>
                    <Text variant="bodyStrong" numberOfLines={1} style={styles.postTitle}>
                      {p.title}
                    </Text>
                    <Text variant="caption" color="textTertiary">
                      {timeAgo(p.createdAt)}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            <View style={styles.block}>
              <SectionHeader title="Members" eyebrow={`${society.memberCount}`} />
              <View style={styles.chips}>
                {members.slice(0, 24).map(m => (
                  <View key={m.uid} style={styles.member}>
                    <Avatar name={m.name} uri={m.photoUrl} size={44} />
                    <Text variant="caption" numberOfLines={1} color={m.role === 'head' ? 'text' : 'textSecondary'} style={styles.memberName}>
                      {m.name.split(' ')[0]}
                    </Text>
                  </View>
                ))}
              </View>
              {members.length > 24 ? (
                <Text variant="small" color="textSecondary" style={styles.more}>
                  and {members.length - 24} more
                </Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chatBtn: { marginTop: 10 },
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
  skel: { marginTop: 16 },
  art: { height: 150, borderRadius: 28, padding: 16 },
  title: { marginTop: 20 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  statText: { marginRight: 4 },
  about: { marginTop: 14 },
  actions: { marginTop: 22 },
  leaveHint: { marginTop: 8 },
  manage: { marginTop: 22 },
  manageTitle: { marginBottom: 10 },
  manageRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  block: { marginTop: 32 },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  personName: { flex: 1, marginLeft: 12 },
  postRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  postTitle: { flex: 1, marginRight: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  member: { width: 56, alignItems: 'center' },
  memberName: { marginTop: 6, maxWidth: 56 },
  more: { marginTop: 12 },
});
