import React, { useEffect } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  Bookmark,
  Building2,
  Info,
  LogOut,
  Moon,
  Pencil,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  FadeIn,
  IconButton,
  ListRow,
  PressableScale,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
} from '../../components/ui';
import { useSocieties } from '../../store/societyStore';
import { useEvents } from '../../store/eventStore';
import type { AppStackParamList } from '../../navigation/types';
import { useNotifications } from '../../store/notificationStore';
import { useSession } from '../../store/sessionStore';
import { ThemeMode, categoryColor, useTheme } from '../../theme';
import { ROLE_LABEL } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { EventRow } from '../events/EventCard';

export function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const user = useSession(s => s.user);
  const membership = useSession(s => s.membership);
  const university = useSession(s => s.university);
  const signOut = useSession(s => s.signOut);
  const deleteAccount = useSession(s => s.deleteAccount);
  const stack = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const permission = useNotifications(s => s.permission);
  const enablePush = useNotifications(s => s.enable);
  const refreshPermission = useNotifications(s => s.refreshPermission);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  const isAdmin = membership?.role === 'uni_admin';
  const pushOn = permission === 'granted';
  const togglePush = (next: boolean) => {
    if (next && permission !== 'denied') {
      enablePush();
      return;
    }
    // Android does not let an app revoke or re-ask a denied permission: send the student to settings.
    Alert.alert(
      next ? 'Turn on notifications' : 'Turn off notifications',
      'Notification permission is managed in your phone settings.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Open settings', onPress: () => Linking.openSettings() }],
    );
  };

  const confirmSignOut = async () => {
    if (await confirm({ title: 'Sign out?', message: 'You can sign back in any time.', confirmLabel: 'Sign out', tone: 'neutral' })) {
      signOut();
    }
  };

  const confirmDelete = async () => {
    if (await confirm({ title: 'Delete your account?', message: 'This permanently deletes your profile, membership and photos. This cannot be undone.', confirmLabel: 'Delete everything' })) {
      deleteAccount();
    }
  };

  const societies = useSocieties(s => s.societies);
  const joined = societies.filter(s => s.joined);
  const events = useEvents(s => s.events);
  const rsvps = useEvents(s => s.rsvps);
  const myEvents = events
    .filter(e => rsvps[e.id] && e.endsAt >= Date.now())
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, 3);
  const attended = Object.values(rsvps).filter(r => r.checkedInAt).length;

  return (
    <Screen scroll tabScreen>
      {/* Identity */}
      <FadeIn>
        <View style={styles.top}>
          <Avatar name={user?.name ?? 'Student'} uri={user?.photoUrl} size={84} />
          <View style={styles.topRight}>
            <IconButton icon={Pencil} onPress={() => stack.navigate('EditProfile')} accessibilityLabel="Edit profile" />
          </View>
        </View>
        <Text variant="title1" style={styles.name}>
          {user?.name}
        </Text>
        <Text variant="body" color="textSecondary">
          {user?.email}
        </Text>
        <View style={styles.badges}>
          <Badge label={membership ? ROLE_LABEL[membership.role] : 'Student'} tone="primary" />
          {university ? <Badge label={university.fullName} tone="neutral" icon={Building2} /> : null}
        </View>
        {membership ? (
          <Text variant="small" color="textSecondary" style={styles.studentLine}>
            {membership.studentId} · {membership.department}
          </Text>
        ) : null}
      </FadeIn>

      {/* Stats: set in type, not in cards */}
      <View style={[styles.stats, { borderColor: colors.border }]}>
        <Stat value={String(attended)} label="Events attended" />
        <View style={[styles.statLine, { backgroundColor: colors.border }]} />
        <Stat value={String(joined.length)} label="Societies" />
      </View>

      {/* Societies */}
      <View style={styles.block}>
        <SectionHeader title="Your societies" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.rail}
          contentContainerStyle={styles.railContent}>
          {joined.length === 0 ? (
            <Text variant="body" color="textSecondary" style={styles.railEmpty}>
              Societies you join will show up here.
            </Text>
          ) : null}
          {joined.map(s => (
            <PressableScale
              key={s.id}
              onPress={() => stack.navigate('SocietyDetail', { societyId: s.id })}
              scaleTo={0.97}
              accessibilityRole="button"
              style={[styles.society, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Avatar name={s.name} size={40} square tint={categoryColor(colors, s.category)} />
              <Text variant="cardTitle" numberOfLines={2} style={styles.societyName}>
                {s.name}
              </Text>
              <Text variant="caption" color="textSecondary">
                {s.memberCount} {s.memberCount === 1 ? 'member' : 'members'}
              </Text>
            </PressableScale>
          ))}
        </ScrollView>
      </View>

      {/* My events */}
      <View style={styles.block}>
        <SectionHeader title="Your events" actionLabel="My tickets" onAction={() => stack.navigate('MyTickets')} />
        {myEvents.length === 0 ? (
          <Text variant="body" color="textSecondary">
            Events you join will show up here.
          </Text>
        ) : (
          myEvents.map((e, i) => <EventRow key={e.id} event={e} last={i === myEvents.length - 1} />)
        )}
      </View>

      {/* Settings: compact, at the bottom */}
      <View style={styles.block}>
        <SectionHeader title="Settings" />
        <Card padding={16}>
          <View style={styles.appearance}>
            <View style={styles.appearanceHead}>
              <View style={[styles.appearanceIcon, { backgroundColor: colors.surfaceAlt }]}>
                <Moon size={18} color={colors.text} strokeWidth={2} />
              </View>
              <Text variant="bodyStrong" style={styles.appearanceTitle}>
                Appearance
              </Text>
            </View>
            <SegmentedControl<ThemeMode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </View>
          <ListRow
            icon={Bell}
            title="Push notifications"
            subtitle={pushOn ? 'Alerts, reminders and event updates' : 'Off. Turn on to get urgent alerts'}
            right={
              <Switch
                value={pushOn}
                onValueChange={togglePush}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={pushOn ? '#14231D' : '#FFFFFF'}
              />
            }
          />
          <ListRow
            icon={Bookmark}
            title="Saved posts"
            subtitle="Updates you bookmarked"
            onPress={() => stack.navigate('Feed', { saved: true })}
          />
          {isAdmin ? (
            <ListRow icon={ShieldCheck} title="Admin" subtitle="Numbers, members, reports and notices" onPress={() => stack.navigate('AdminHome')} />
          ) : null}
          <ListRow icon={ShieldCheck} title="Privacy and data" onPress={() => stack.navigate('Privacy')} />
          <ListRow
            icon={Info}
            title="About IAC Campus"
            subtitle="Version 1.0.0"
            last
          />
        </Card>
      </View>

      <View style={styles.actions}>
        <Button title="Sign out" variant="ghost" icon={LogOut} onPress={confirmSignOut} />
        <Button title="Delete account" variant="danger" icon={Trash2} onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="title1">{value}</Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  topRight: { paddingTop: 4 },
  name: { marginTop: 16 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  studentLine: { marginTop: 12 },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLine: { width: StyleSheet.hairlineWidth, height: 36 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  block: { marginTop: 34 },
  rail: { marginHorizontal: -20 },
  railContent: { paddingHorizontal: 20, gap: 12 },
  railEmpty: { paddingVertical: 6 },
  society: { width: 148, borderWidth: 1, borderRadius: 20, padding: 14 },
  societyName: { marginTop: 12, marginBottom: 4, minHeight: 44 },

  appearance: { gap: 12, paddingBottom: 6 },
  appearanceHead: { flexDirection: 'row', alignItems: 'center' },
  appearanceIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  appearanceTitle: { marginLeft: 12 },

  actions: { gap: 12, marginTop: 34 },
});
