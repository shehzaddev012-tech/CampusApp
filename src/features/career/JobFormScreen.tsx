import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Chip, Input, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { JOB_KINDS, type JobKind } from '../../types/domain';
import { FormError } from '../auth/AuthPage';

type Props = NativeStackScreenProps<AppStackParamList, 'JobForm'>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Admins post openings on behalf of companies. A deadline is typed as YYYY-MM-DD. */
export function JobFormScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<JobKind>('internship');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [applyEmail, setApplyEmail] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = applyUrl.trim();
  const email = applyEmail.trim();
  const urlOk = url === '' || /^https:\/\/\S+\.\S+/.test(url);
  const emailOk = email === '' || EMAIL.test(email);
  const deadlineMs = deadline.trim() === '' ? null : /^\d{4}-\d{2}-\d{2}$/.test(deadline.trim()) ? new Date(`${deadline.trim()}T23:59:59`).getTime() : NaN;
  const valid = company.trim().length >= 2 && title.trim().length >= 2 && (url !== '' || email !== '') && urlOk && emailOk && !Number.isNaN(deadlineMs);

  const save = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await backend.career.createJob({ company: company.trim(), title: title.trim(), kind, location: location.trim(), description: description.trim(), applyUrl: url || null, applyEmail: email || null, deadline: deadlineMs });
      show({ title: 'Posted', body: 'Students can now see this opening.', tone: 'success' });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar close title="Post an opening" onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Input label="Company" value={company} onChangeText={setCompany} maxLength={80} />
        <View style={styles.field}>
          <Input label="Role" placeholder="e.g. Junior Developer" value={title} onChangeText={setTitle} maxLength={100} />
        </View>
        <View style={styles.field}>
          <Text variant="smallStrong" style={styles.label}>
            Type
          </Text>
          <View style={styles.chips}>
            {JOB_KINDS.map(k => (
              <Chip key={k.value} label={k.label} selected={kind === k.value} onPress={() => setKind(k.value)} />
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Input label="Location (optional)" placeholder="City, or Remote" value={location} onChangeText={setLocation} maxLength={80} />
        </View>
        <View style={styles.field}>
          <Input label="About the role (optional)" value={description} onChangeText={setDescription} multiline maxLength={1500} />
        </View>
        <View style={styles.field}>
          <Input label="Apply link" placeholder="https://company.com/jobs/123" value={applyUrl} onChangeText={setApplyUrl} autoCapitalize="none" keyboardType="url" error={urlOk ? null : 'The link must start with https://'} />
        </View>
        <View style={styles.field}>
          <Input label="Or apply by email" placeholder="hr@company.com" value={applyEmail} onChangeText={setApplyEmail} autoCapitalize="none" keyboardType="email-address" error={emailOk ? null : 'Enter a valid email'} hint="Give a link, an email, or both." />
        </View>
        <View style={styles.field}>
          <Input label="Deadline (optional)" placeholder="YYYY-MM-DD" value={deadline} onChangeText={setDeadline} keyboardType="numbers-and-punctuation" maxLength={10} error={Number.isNaN(deadlineMs) ? 'Use the form 2026-12-31' : null} />
        </View>
        <View style={styles.field}>
          <FormError message={error} />
          <Button title="Post opening" onPress={save} loading={busy} disabled={!valid} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 20 },
  field: { marginTop: 20 },
  label: { marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
