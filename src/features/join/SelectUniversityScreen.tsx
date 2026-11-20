import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowUpRight, Building2, LogOut, Search, Users } from 'lucide-react-native';

import { Avatar, Card, EmptyState, IconButton, Input, Screen, Skeleton, Text } from '../../components/ui';
import type { JoinStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useSession } from '../../store/sessionStore';
import { useTheme } from '../../theme';
import type { University } from '../../types/domain';

type Props = NativeStackScreenProps<JoinStackParamList, 'SelectUniversity'>;

export function SelectUniversityScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const signOut = useSession(s => s.signOut);
  const user = useSession(s => s.user);

  const [items, setItems] = useState<University[] | null>(null);
  const [query, setQuery] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    backend.universities
      .list()
      .then(setItems)
      .catch(() => setFailed(true));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(
      u => !q || u.name.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q),
    );
  }, [items, query]);

  return (
    <Screen scroll>
      <View style={styles.top}>
        <View style={styles.topText}>
          <Text variant="overline" color="textSecondary" style={styles.step}>
            STEP 1 OF 2
          </Text>
          <Text variant="hero">Choose your{'\n'}university</Text>
        </View>
        <IconButton icon={LogOut} onPress={signOut} accessibilityLabel="Sign out" />
      </View>
      <Text variant="body" color="textSecondary" style={styles.sub}>
        {user ? `Signed in as ${user.email}. ` : ''}You will only see content from the university you join.
      </Text>

      <Input icon={Search} placeholder="Search universities" value={query} onChangeText={setQuery} autoCorrect={false} />

      <View style={styles.list}>
        {failed ? (
          <EmptyState icon={Building2} title="Could not load universities" message="Check your connection and try again." />
        ) : items === null ? (
          <View style={styles.skeletons}>
            {[0, 1, 2].map(i => (
              <Skeleton key={i} height={78} radius={20} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No match"
            message="Try a different name, or ask your society admin to add your university."
          />
        ) : (
          filtered.map(item => (
            <Card
              key={item.id}
              onPress={() => navigation.navigate('StudentDetails', { university: item })}
              padding={14}>
              <View style={styles.row}>
                <Avatar name={item.name} size={52} square tint={item.accent} />
                <View style={styles.rowText}>
                  <Text variant="title3">{item.name}</Text>
                  <View style={styles.meta}>
                    <Users size={13} color={colors.textTertiary} />
                    <Text variant="small" color="textSecondary" style={styles.metaText}>
                      {item.studentCount ? `${item.studentCount.toLocaleString()} students` : item.fullName}
                    </Text>
                  </View>
                </View>
                <ArrowUpRight size={20} color={colors.text} strokeWidth={2.2} />
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  topText: { flex: 1 },
  step: { marginBottom: 8 },
  sub: { marginTop: 12, marginBottom: 20 },
  list: { marginTop: 20, gap: 12 },
  skeletons: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1, marginLeft: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  metaText: { marginLeft: 5 },
});
