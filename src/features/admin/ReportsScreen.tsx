import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ShieldCheck } from 'lucide-react-native';

import { Badge, Button, Card, EmptyState, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import type { ModerationReport, ReportTarget } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'Reports'>;

const WHAT: Record<ReportTarget, string> = {
  note: 'Notes',
  book: 'Book listing',
  study_group: 'Study group',
  job: 'Job opening',
  lost_item: 'Lost & found post',
  photo: 'Photo',
  message: 'Message',
  user: 'Student',
  story: 'Story',
};
const REMOVE: Record<ReportTarget, { button: string; message: string }> = {
  note: { button: 'Hide it', message: 'The notes are hidden from students.' },
  book: { button: 'Hide it', message: 'The listing is hidden from the market.' },
  study_group: { button: 'Close it', message: 'The group is closed to new members.' },
  job: { button: 'Close it', message: 'The opening is closed.' },
  lost_item: { button: 'Delete it', message: 'The post is deleted.' },
  photo: { button: 'Delete it', message: 'The photo is deleted for everyone.' },
  message: { button: 'Delete it', message: 'The message is deleted.' },
  story: { button: 'Delete it', message: 'The story is deleted.' },
  user: { button: 'Suspend them', message: 'The student is suspended and signed out. You can approve them again later in Members.' },
};

/** Admin: reports from students, one card per report. */
export function ReportsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [reports, setReports] = useState<ModerationReport[] | null>(null);

  const load = useCallback(async () => {
    try {
      setReports(await backend.reports.list('open'));
    } catch {
      setReports(prev => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const act = async (r: ModerationReport, action: 'remove' | 'dismiss') => {
    const info = REMOVE[r.targetType];
    if (action === 'remove' && !(await confirm({ title: `${info.button}?`, message: info.message, confirmLabel: info.button }))) {
      return;
    }
    try {
      await backend.reports.resolve(r.id, action);
      load();
    } catch (e) {
      show({ title: 'Could not update', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Reports" onBack={() => navigation.goBack()} />
      <FlatList
        data={reports ?? []}
        keyExtractor={r => r.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={reports === null ? <Skeleton height={140} radius={20} /> : <EmptyState icon={ShieldCheck} title="All clear" message="No open reports. When a student reports something, it shows up here." />}
        renderItem={({ item: r }) => (
          <Card padding={16}>
            <View style={styles.head}>
              <Badge label={WHAT[r.targetType]} tone="info" />
              <Text variant="caption" color="textTertiary">
                {timeAgo(r.createdAt)}
              </Text>
            </View>
            <Text variant="title3" style={styles.title}>
              {r.title}
            </Text>
            <Text variant="small" color="textSecondary" style={styles.line}>
              Reason: {r.reason.replace('_', ' ')} · reported by {r.reporter}
              {r.totalReports > 1 ? ` and ${r.totalReports - 1} more` : ''}
            </Text>
            {r.details ? (
              <Text variant="body" color="textSecondary" style={styles.line}>
                “{r.details}”
              </Text>
            ) : null}
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button title="Not a problem" size="md" variant="soft" onPress={() => act(r, 'dismiss')} />
              </View>
              <View style={styles.flex}>
                <Button title={REMOVE[r.targetType].button} size="md" variant="danger" onPress={() => act(r, 'remove')} />
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: GUTTER, paddingTop: 16, flexGrow: 1 },
  sep: { height: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: 10 },
  line: { marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flex: { flex: 1 },
});
