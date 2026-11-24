import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { IdCard, LogOut, WifiOff } from 'lucide-react-native';

import { Button, Card, Chip, EmptyState, IconButton, Input, Screen, Skeleton, Text, UniversityLogo } from '../../components/ui';
import type { JoinStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useSession } from '../../store/sessionStore';
import { STUDENT_ID_RE, type University } from '../../types/domain';

type Props = NativeStackScreenProps<JoinStackParamList, 'StudentDetails'>;

/**
 * The only step of joining: this app is for one university, so there is nothing to choose except
 * your student ID and your school. An admin then approves the request.
 */
export function StudentDetailsScreen(_: Props) {
  const submit = useSession(s => s.submitJoinRequest);
  const busy = useSession(s => s.busy);
  const signOut = useSession(s => s.signOut);
  const user = useSession(s => s.user);

  const [university, setUniversity] = useState<University | null>(null);
  const [failed, setFailed] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const load = () => {
    setFailed(false);
    backend.universities
      .list()
      .then(list => (list[0] ? setUniversity(list[0]) : setFailed(true)))
      .catch(() => setFailed(true));
  };
  useEffect(load, []);

  const idOk = STUDENT_ID_RE.test(studentId.trim().toUpperCase());
  const idError = touched && !idOk ? 'Use the format IAC-FA22-BCS-021' : null;
  const valid = idOk && !!department;

  const onSubmit = async () => {
    setTouched(true);
    if (!valid || !department || !university) {
      return;
    }
    const ok = await submit({ university, studentId: studentId.trim().toUpperCase(), department });
    if (!ok) {
      Alert.alert('Could not send request', useSession.getState().error ?? 'Please try again.');
    }
  };

  return (
    <Screen scroll>
      <View style={styles.top}>
        <View style={styles.topText}>
          <Text variant="hero">Join your{'\n'}campus</Text>
        </View>
        <IconButton icon={LogOut} onPress={signOut} accessibilityLabel="Sign out" />
      </View>
      <Text variant="body" color="textSecondary" style={styles.sub}>
        {user ? `Signed in as ${user.email}.` : ''}
      </Text>

      {failed ? (
        <EmptyState icon={WifiOff} title="Could not load the university" message="Check your connection and try again." actionLabel="Try again" onAction={load} />
      ) : !university ? (
        <Skeleton height={64} radius={20} />
      ) : (
        <>
          <Card padding={12} style={styles.uni}>
            <View style={styles.uniRow}>
              <UniversityLogo size={48} />
              <View style={styles.uniText}>
                <Text variant="caption" color="textSecondary">
                  Joining
                </Text>
                <Text variant="bodyStrong">{university.fullName}</Text>
              </View>
            </View>
          </Card>

          <Input
            label="Student ID / Roll number"
            icon={IdCard}
            placeholder="IAC-FA22-BCS-021"
            value={studentId}
            onChangeText={setStudentId}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={24}
            error={idError}
            hint="IAC, then your intake and year, your programme and your roll number."
          />

          <Text variant="smallStrong" style={styles.label}>
            Your school
          </Text>
          <View style={styles.chips}>
            {university.departments.map(d => (
              <Chip key={d} label={d} selected={department === d} onPress={() => setDepartment(d)} />
            ))}
          </View>

          <View style={styles.cta}>
            <Button title="Join IAC" onPress={onSubmit} loading={busy} disabled={touched && !valid} />
            <Text variant="caption" color="textSecondary" align="center" style={styles.note}>
              You get in right away. One student ID can be used by one account only.
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  topText: { flex: 1 },
  sub: { marginTop: 10 },
  uni: { marginTop: 20, marginBottom: 24 },
  uniRow: { flexDirection: 'row', alignItems: 'center' },
  uniText: { marginLeft: 12, flex: 1 },
  label: { marginTop: 24, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cta: { marginTop: 32 },
  note: { marginTop: 14, paddingHorizontal: 12 },
});
