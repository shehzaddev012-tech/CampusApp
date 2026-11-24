import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Users } from 'lucide-react-native';

import { Badge, Card, EmptyState, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { GUTTER, useTheme } from '../../theme';
import type { EventAttendee } from '../../types/domain';
import { timeLabel } from '../../utils/eventTime';

type Props = NativeStackScreenProps<AppStackParamList, 'EventAttendees'>;

/** Organiser / admin: everyone with a ticket for the event, and who has come in. */
export function EventAttendeesScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<EventAttendee[] | null>(null);

  useEffect(() => {
    backend.events
      .attendees(route.params.eventId)
      .then(setRows)
      .catch(() => setRows([]));
  }, [route.params.eventId]);

  const going = rows?.filter(r => r.status === 'going') ?? [];
  const came = going.filter(r => r.checkedInAt).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Attendees" onBack={() => navigation.goBack()} />
      {!rows ? (
        <View style={styles.pad}>
          <Skeleton height={64} radius={16} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r, i) => `${r.name}${i}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListHeaderComponent={
            <Text variant="body" color="textSecondary" style={styles.summary}>
              {route.params.title}: {going.length} with a ticket, {came} came in.
            </Text>
          }
          ListEmptyComponent={<EmptyState icon={Users} title="No tickets yet" message="Students who get a ticket appear here." />}
          renderItem={({ item }) => (
            <Card padding={14}>
              <View style={styles.row}>
                <View style={styles.text}>
                  <Text variant="cardTitle" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {item.checkedInAt ? `Came in at ${timeLabel(item.checkedInAt)}` : item.status === 'waitlist' ? 'On the waiting list' : 'Has a ticket'}
                    {item.volunteer ? ' · Volunteer' : ''}
                    {item.rating ? ` · Rated ${item.rating}/5` : ''}
                  </Text>
                </View>
                <Badge label={item.checkedInAt ? 'Checked in' : item.status === 'waitlist' ? 'Waiting' : 'Going'} tone={item.checkedInAt ? 'primary' : 'neutral'} />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: GUTTER },
  list: { paddingHorizontal: GUTTER, paddingTop: 12, flexGrow: 1 },
  summary: { marginBottom: 14 },
  sep: { height: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1, marginRight: 10 },
});
