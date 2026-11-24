import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2 } from 'lucide-react-native';

import { Avatar, Badge, Card, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { GUTTER, useTheme } from '../../theme';
import { PersonProfile, ROLE_LABEL } from '../../types/domain';

type Props = NativeStackScreenProps<AppStackParamList, 'PersonProfile'>;

/** Another student's profile, opened by tapping their name at the top of a chat. Shows only what is public. */
export function PersonProfileScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<PersonProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    backend.chat
      .person(route.params.userId)
      .then(setP)
      .catch(() => setFailed(true));
  }, [route.params.userId]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar title="Profile" onBack={() => navigation.goBack()} />
      {failed ? (
        <Text variant="body" color="textSecondary" align="center" style={styles.pad}>
          This profile is not available.
        </Text>
      ) : !p ? (
        <View style={styles.pad}>
          <Skeleton height={120} radius={20} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.head}>
            <Avatar name={p.name} uri={p.photoUrl} size={112} />
            <Text variant="title2" align="center" style={styles.name}>
              {p.name}
            </Text>
            <View style={styles.badges}>
              <Badge label={ROLE_LABEL[p.role]} tone="primary" />
              {p.department ? <Badge label={p.department} tone="neutral" icon={Building2} /> : null}
            </View>
          </View>

          <Text variant="cardTitle" style={styles.section}>
            Societies
          </Text>
          {p.societies.length === 0 ? (
            <Text variant="small" color="textTertiary">
              Not in any society yet.
            </Text>
          ) : (
            <Card padding={4}>
              {p.societies.map(s => (
                <Pressable key={s.id} onPress={() => navigation.navigate('SocietyDetail', { societyId: s.id })} accessibilityRole="button" style={styles.row}>
                  <Text variant="body" style={styles.rowText}>
                    {s.name}
                  </Text>
                  {s.head ? <Badge label="Head" tone="ink" /> : null}
                </Pressable>
              ))}
            </Card>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: GUTTER },
  content: { paddingHorizontal: GUTTER, paddingTop: 24 },
  head: { alignItems: 'center' },
  name: { marginTop: 14 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  section: { marginTop: 32, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 12 },
  rowText: { flex: 1 },
});
