import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, UserCheck, X } from 'lucide-react-native';

import { Button, Card, EmptyState, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useEvents } from '../../store/eventStore';
import { GUTTER, useTheme } from '../../theme';
import { confirm } from '../../utils/confirm';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'GuestApprovals'>;

/** Staff queue: approve or reject the guest passes students asked for. */
export function GuestApprovalsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pending = useEvents(s => s.pending);
  const decide = useEvents(s => s.decidePass);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Guest approvals" onBack={() => navigation.goBack()} />
      <FlatList
        data={pending}
        keyExtractor={p => p.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <EmptyState icon={UserCheck} title="Nothing to approve" message="New guest pass requests will appear here." />
        }
        renderItem={({ item }) => (
          <Card padding={16}>
            <Text variant="cardTitle">{item.guestName}</Text>
            <Text variant="small" color="textSecondary">
              {item.guestPhone}
            </Text>
            <Text variant="small" color="textSecondary" style={styles.meta}>
              {item.eventTitle} · invited by {item.hostName} · {timeAgo(item.createdAt)}
            </Text>
            <View style={styles.buttons}>
              <View style={styles.flex}>
                <Button title="Reject" variant="danger" size="md" icon={X} onPress={async () => {
                    if (await confirm({ title: `Reject ?`, message: 'The pass will not work at the gate.', confirmLabel: 'Reject' })) {
                      decide(item.id, false);
                    }
                  }} />
              </View>
              <View style={styles.flex}>
                <Button title="Approve" size="md" icon={Check} onPress={() => decide(item.id, true)} />
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
  meta: { marginTop: 10 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  flex: { flex: 1 },
});
