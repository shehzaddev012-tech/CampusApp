import React, { useCallback, useState } from 'react';
import { FlatList, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Bookmark, BookmarkCheck, Briefcase, MapPin, Plus } from 'lucide-react-native';

import { Badge, Button, Card, Chip, EmptyState, IconButton, Input, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useSession } from '../../store/sessionStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { JOB_KINDS, type Job, type JobKind } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { reportContent } from '../../utils/report';

type Props = NativeStackScreenProps<AppStackParamList, 'Jobs'>;

const dateOf = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function JobsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const role = useSession(s => s.membership?.role);
  const isAdmin = role === 'uni_admin';
  const [scope, setScope] = useState<'open' | 'saved'>('open');
  const [kind, setKind] = useState<JobKind | undefined>();
  const [q, setQ] = useState('');
  const [jobs, setJobs] = useState<Job[] | null>(null);

  const load = useCallback(async () => {
    try {
      setJobs(await backend.career.listJobs({ scope, kind, q: q.trim() || undefined, includeClosed: isAdmin }));
    } catch {
      setJobs(prev => prev ?? []);
    }
  }, [scope, kind, q, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(load, 250);
      return () => clearTimeout(t);
    }, [load]),
  );

  const fail = (title: string, e: unknown) => show({ title, body: e instanceof Error ? e.message : undefined, tone: 'alert' });

  const toggleSave = async (j: Job) => {
    setJobs(prev => (prev ? prev.map(x => (x.id === j.id ? { ...x, saved: !x.saved } : x)) : prev));
    try {
      await backend.career.saveJob(j.id, !j.saved);
      if (scope === 'saved') {
        load();
      }
    } catch (e) {
      fail('Could not save', e);
      load();
    }
  };

  const apply = async (j: Job) => {
    const target = j.applyUrl ?? `mailto:${j.applyEmail}`;
    if (j.applyUrl && !(await confirm({ title: 'Open the application page?', message: `You will leave IAC Campus and open ${new URL(j.applyUrl).host}.`, confirmLabel: 'Open', tone: 'neutral' }))) {
      return;
    }
    Linking.openURL(target).catch(() => fail('Could not open the link', new Error('No app on this phone can open it.')));
  };

  const toggleClosed = async (j: Job) => {
    try {
      await backend.career.setJobClosed(j.id, j.status === 'open');
      load();
    } catch (e) {
      fail('Could not update', e);
    }
  };

  const remove = async (j: Job) => {
    if (!(await confirm({ title: 'Delete this opening?', message: 'Students will no longer see it. This cannot be undone.', confirmLabel: 'Delete' }))) {
      return;
    }
    try {
      await backend.career.removeJob(j.id);
      load();
    } catch (e) {
      fail('Could not delete', e);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Jobs and internships" onBack={() => navigation.goBack()} right={isAdmin ? <IconButton icon={Plus} onPress={() => navigation.navigate('JobForm')} accessibilityLabel="Post an opening" /> : undefined} />
      <View style={styles.search}>
        <Input placeholder="Search by role or company" value={q} onChangeText={setQ} returnKeyType="search" />
      </View>
      <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip label="Openings" selected={scope === 'open' && !kind} onPress={() => { setJobs(null); setScope('open'); setKind(undefined); }} />
        {JOB_KINDS.map(k => (
          <Chip key={k.value} label={k.label} selected={scope === 'open' && kind === k.value} onPress={() => { setJobs(null); setScope('open'); setKind(kind === k.value ? undefined : k.value); }} />
        ))}
        <Chip label="Saved" icon={Bookmark} selected={scope === 'saved'} onPress={() => { setJobs(null); setScope('saved'); setKind(undefined); }} />
      </ScrollView>
      </View>
      <FlatList
        data={jobs ?? []}
        keyExtractor={j => j.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          jobs === null ? (
            <Skeleton height={140} radius={20} />
          ) : (
            <EmptyState
              icon={Briefcase}
              title={scope === 'saved' ? 'Nothing saved' : 'No openings yet'}
              message={scope === 'saved' ? 'Tap the bookmark on an opening to keep it here.' : isAdmin ? 'Tap + to post the first opening.' : 'Your university has not posted any openings yet. Check back soon.'}
            />
          )
        }
        renderItem={({ item: j }) => (
          <Card padding={16}>
            <View style={styles.head}>
              <View style={styles.tags}>
                <Badge label={JOB_KINDS.find(k => k.value === j.kind)?.label ?? 'Job'} tone="info" />
                {j.status === 'closed' ? <Badge label="Closed" tone="neutral" /> : j.expired ? <Badge label="Deadline passed" tone="warning" /> : null}
              </View>
              <IconButton icon={j.saved ? BookmarkCheck : Bookmark} size={36} onPress={() => toggleSave(j)} accessibilityLabel={j.saved ? 'Remove from saved' : 'Save'} />
            </View>
            <Text variant="title3" style={styles.title}>
              {j.title}
            </Text>
            <Text variant="cardTitle" color="textSecondary">
              {j.company}
            </Text>
            {j.location ? (
              <View style={styles.row}>
                <MapPin size={14} color={colors.textTertiary} />
                <Text variant="small" color="textSecondary" style={styles.rowText}>
                  {j.location}
                </Text>
              </View>
            ) : null}
            {j.description ? (
              <Text variant="body" color="textSecondary" style={styles.desc} numberOfLines={4}>
                {j.description}
              </Text>
            ) : null}
            {j.deadline ? (
              <Text variant="caption" color="textTertiary" style={styles.deadline}>
                Apply by {dateOf(j.deadline)}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button title="Apply" size="md" disabled={j.status === 'closed' || j.expired} onPress={() => apply(j)} />
              </View>
              {isAdmin ? <Button title={j.status === 'open' ? 'Close' : 'Reopen'} size="md" variant="soft" fullWidth={false} onPress={() => toggleClosed(j)} /> : null}
              {isAdmin ? <Button title="Delete" size="md" variant="danger" fullWidth={false} onPress={() => remove(j)} /> : <Button title="Report" size="md" variant="ghost" fullWidth={false} onPress={() => reportContent('job', j.id, 'opening')} />}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  search: { paddingHorizontal: GUTTER, paddingTop: 12 },
  filters: { gap: 8, paddingHorizontal: GUTTER, paddingVertical: 12 },
  list: { paddingHorizontal: GUTTER, paddingTop: 4, flexGrow: 1 },
  sep: { height: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags: { flexDirection: 'row', gap: 6 },
  title: { marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rowText: { marginLeft: 6 },
  desc: { marginTop: 10 },
  deadline: { marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, alignItems: 'center' },
  flex: { flex: 1 },
});
