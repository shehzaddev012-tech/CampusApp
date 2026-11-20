import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, IdCard } from 'lucide-react-native';

import { Avatar, Button, Card, Chip, IconButton, Input, Screen, Text } from '../../components/ui';
import type { JoinStackParamList } from '../../navigation/types';
import { useSession } from '../../store/sessionStore';

type Props = NativeStackScreenProps<JoinStackParamList, 'StudentDetails'>;

const THIS_YEAR = new Date().getFullYear();
const BATCHES = [0, 1, 2, 3, 4].map(i => String(THIS_YEAR - i));

export function StudentDetailsScreen({ navigation, route }: Props) {
  const { university } = route.params;
  const submit = useSession(s => s.submitJoinRequest);
  const busy = useSession(s => s.busy);

  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState<string | null>(null);
  const [batch, setBatch] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const idError = touched && studentId.trim().length < 3 ? 'Enter your student ID (at least 3 characters)' : null;
  const valid = studentId.trim().length >= 3 && !!department && !!batch;

  const onSubmit = async () => {
    setTouched(true);
    if (!valid || !department || !batch) {
      return;
    }
    const ok = await submit({ university, studentId: studentId.trim().toUpperCase(), department, batch });
    if (!ok) {
      Alert.alert('Could not send request', useSession.getState().error ?? 'Please try again.');
    }
  };

  return (
    <Screen scroll>
      <View style={styles.back}>
        <IconButton icon={ArrowLeft} onPress={() => navigation.goBack()} accessibilityLabel="Go back" />
      </View>

      <Text variant="overline" color="textSecondary" style={styles.step}>
        STEP 2 OF 2
      </Text>
      <Text variant="hero">Tell us about{'\n'}yourself</Text>

      <Card padding={12} style={styles.uni}>
        <View style={styles.uniRow}>
          <Avatar name={university.name} size={40} square tint={university.accent} />
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
        placeholder="e.g. 22-CS-104"
        value={studentId}
        onChangeText={setStudentId}
        autoCapitalize="characters"
        autoCorrect={false}
        error={idError}
        hint="Your university admin uses this to verify you."
      />

      <Text variant="smallStrong" style={styles.label}>
        Department
      </Text>
      <View style={styles.chips}>
        {university.departments.map(d => (
          <Chip key={d} label={d} selected={department === d} onPress={() => setDepartment(d)} />
        ))}
      </View>

      <Text variant="smallStrong" style={styles.label}>
        Batch (year of admission)
      </Text>
      <View style={styles.chips}>
        {BATCHES.map(b => (
          <Chip key={b} label={b} selected={batch === b} onPress={() => setBatch(b)} />
        ))}
      </View>

      <View style={styles.cta}>
        <Button title="Send join request" onPress={onSubmit} loading={busy} disabled={touched && !valid} />
        <Text variant="caption" color="textSecondary" align="center" style={styles.note}>
          An admin from {university.name} will review your request. You will be notified when it is approved.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { marginTop: 4, marginBottom: 20, alignItems: 'flex-start' },
  step: { marginBottom: 8 },
  uni: { marginTop: 22, marginBottom: 24 },
  uniRow: { flexDirection: 'row', alignItems: 'center' },
  uniText: { marginLeft: 12 },
  label: { marginTop: 24, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cta: { marginTop: 32 },
  note: { marginTop: 14, paddingHorizontal: 12 },
});
