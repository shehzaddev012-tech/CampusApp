import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock, Megaphone } from 'lucide-react-native';

import { Button, Card, Chip, EmptyState, Input, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useFeed } from '../../store/feedStore';
import { useSession } from '../../store/sessionStore';
import { manageableSocieties, useSocieties } from '../../store/societyStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { Membership, PostKind, Role, University, allowedPostKinds } from '../../types/domain';
import { kindMeta } from './kind';

type Props = NativeStackScreenProps<AppStackParamList, 'Composer'>;

/** The byline shown on the post, derived from who is posting. */
function defaultSource(kind: PostKind, role: Role, m: Membership, uni: University | null): string {
  if (kind === 'alert' && role === 'security') {
    return 'Campus Security';
  }
  if (role === 'dept_admin') {
    return `${m.department} Department`;
  }
  return `${uni?.name ?? 'University'} Administration`;
}

export function ComposerScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const membership = useSession(s => s.membership);
  const university = useSession(s => s.university);
  const create = useFeed(s => s.create);
  const show = useToast(s => s.show);

  const kinds = membership ? allowedPostKinds(membership.role) : [];
  const societies = useSocieties(s => s.societies);
  const isAdmin = membership?.role === 'uni_admin' || membership?.role === 'dept_admin';
  const mine = manageableSocieties(societies, isAdmin);
  const [societyId, setSocietyId] = useState<string | null>(route.params?.societyId ?? null);
  const [kind, setKind] = useState<PostKind>(route.params?.societyId && kinds.includes('society') ? 'society' : (kinds[0] ?? 'official'));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!membership || kinds.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar close title="New post" onBack={() => navigation.goBack()} />
        <EmptyState
          icon={Lock}
          title="You cannot post yet"
          message="Only society heads, department admins and university admins can publish updates."
        />
      </View>
    );
  }

  const canPin = (membership.role === 'uni_admin' || membership.role === 'dept_admin') && kind !== 'alert';
  // A society update names its society; with only one to choose from, it is chosen for you.
  const society = kind === 'society' ? (mine.find(s => s.id === societyId) ?? (mine.length === 1 ? mine[0] : undefined)) : undefined;
  const needsSociety = kind === 'society';
  const valid = title.trim().length >= 3 && body.trim().length >= 10 && (!needsSociety || !!society);
  const source = kind === 'society' ? (society?.name ?? 'Choose a society') : defaultSource(kind, membership.role, membership, university);

  const publish = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    try {
      const id = await create({
        kind,
        title: title.trim(),
        body: body.trim(),
        source: kind === 'society' ? undefined : source,
        societyId: kind === 'society' ? (society?.id ?? null) : null,
        channel,
        pinned: canPin && pinned,
      });
      if (id) {
        show({
          title: 'Published',
          body: channel ? `Sent to ${channel}.` : `Sent to everyone at ${university?.name ?? 'your university'}.`,
          tone: 'success',
        });
        navigation.goBack();
      }
    } catch {
      show({ title: 'Could not publish', body: 'Check your connection and try again.', tone: 'alert' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TopBar close title="New post" onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text variant="smallStrong" style={styles.label}>
          Type
        </Text>
        <View style={styles.chips}>
          {kinds.map(k => {
            const meta = kindMeta(k, colors);
            return (
              <Chip
                key={k}
                label={meta.name}
                icon={meta.icon}
                selected={kind === k}
                onPress={() => {
                  setKind(k);
                  if (k === 'alert') {
                    setPinned(false);
                  }
                }}
              />
            );
          })}
        </View>

        <Text variant="caption" color="textSecondary" style={styles.postingAs}>
          Posting as {source}
        </Text>
        {kind === 'society' && mine.length > 1 ? (
          <View style={[styles.chips, styles.societyChips]}>
            {mine.map(s => (
              <Chip key={s.id} label={s.name} selected={society?.id === s.id} onPress={() => setSocietyId(s.id)} />
            ))}
          </View>
        ) : null}
        {kind === 'society' && mine.length === 0 ? (
          <Text variant="small" color="danger" style={styles.postingAs}>
            You do not head a society yet. Ask an admin to make you a head.
          </Text>
        ) : null}

        <View style={styles.field}>
          <Input
            label="Title"
            placeholder="What do students need to know?"
            value={title}
            onChangeText={setTitle}
            maxLength={90}
            hint={`${title.length}/90`}
          />
        </View>

        <View style={styles.field}>
          <Input
            label="Details"
            placeholder="Add the date, time, place and anything students must do."
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1500}
          />
        </View>

        <Text variant="smallStrong" style={[styles.label, styles.labelSpaced]}>
          Send to
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.channels}
          contentContainerStyle={styles.channelsContent}>
          <Chip label="Everyone" selected={channel === null} onPress={() => setChannel(null)} />
          {(university?.departments ?? []).map(d => (
            <Chip key={d} label={d} selected={channel === d} onPress={() => setChannel(channel === d ? null : d)} />
          ))}
        </ScrollView>

        {canPin ? (
          <Card padding={14} style={styles.pinCard}>
            <View style={styles.pinRow}>
              <View style={styles.pinText}>
                <Text variant="bodyStrong">Pin to the top</Text>
                <Text variant="small" color="textSecondary">
                  Pinned updates stay first in everyone's feed.
                </Text>
              </View>
              <Switch
                value={pinned}
                onValueChange={setPinned}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={pinned ? '#14231D' : '#FFFFFF'}
              />
            </View>
          </Card>
        ) : null}

        {kind === 'alert' ? (
          <View style={[styles.note, { backgroundColor: colors.accentSoft }]}>
            <Megaphone size={18} color={colors.coral} strokeWidth={2.2} />
            <Text variant="small" style={styles.noteText}>
              Alerts notify the selected students immediately. Use them for emergencies and urgent changes only.
            </Text>
          </View>
        ) : null}

        <View style={styles.cta}>
          <Button title="Publish" onPress={publish} loading={busy} disabled={!valid} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 20 },
  label: { marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  postingAs: { marginTop: 12 },
  societyChips: { marginTop: 10 },
  field: { marginTop: 22 },
  labelSpaced: { marginTop: 22 },
  channels: { marginHorizontal: -GUTTER },
  channelsContent: { paddingHorizontal: GUTTER, gap: 8 },
  pinCard: { marginTop: 22 },
  pinRow: { flexDirection: 'row', alignItems: 'center' },
  pinText: { flex: 1, marginRight: 12 },
  note: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 16, marginTop: 18 },
  noteText: { flex: 1, marginLeft: 10 },
  cta: { marginTop: 28 },
});
