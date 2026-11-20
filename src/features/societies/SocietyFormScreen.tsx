import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';

import { Button, Chip, EmptyState, Input, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useSession } from '../../store/sessionStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, categoryColor, useTheme } from '../../theme';
import { EVENT_CATEGORIES, EventCategory } from '../../types/domain';
import { FormError } from '../auth/AuthPage';

type Props = NativeStackScreenProps<AppStackParamList, 'SocietyForm'>;

/** Create a society (admins) or change one (its head or an admin). */
export function SocietyFormScreen({ navigation, route }: Props) {
  const societyId = route.params?.societyId;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const role = useSession(s => s.membership?.role);
  const show = useToast(s => s.show);
  const isAdmin = role === 'uni_admin' || role === 'dept_admin';

  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [category, setCategory] = useState<EventCategory>('Social');
  const [loading, setLoading] = useState(!!societyId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!societyId) {
      return;
    }
    backend.societies
      .get(societyId)
      .then(s => {
        setName(s.name);
        setAbout(s.about);
        setCategory(s.category);
      })
      .catch(() => setError('Could not load this society.'))
      .finally(() => setLoading(false));
  }, [societyId]);

  if (!societyId && !isAdmin) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar close title="New society" onBack={() => navigation.goBack()} />
        <EmptyState icon={Lock} title="Admins only" message="Only university admins can create societies." />
      </View>
    );
  }

  const valid = name.trim().length >= 2 && !loading;

  const save = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (societyId) {
        await backend.societies.update(societyId, { name: name.trim(), about: about.trim(), category });
        show({ title: 'Saved', tone: 'success' });
        navigation.goBack();
      } else {
        const created = await backend.societies.create({ name: name.trim(), about: about.trim(), category });
        show({ title: 'Society created', body: 'Now choose its head.', tone: 'success' });
        navigation.replace('SocietyDetail', { societyId: created.id });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar close title={societyId ? 'Edit society' : 'New society'} onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Input label="Name" placeholder="e.g. Debating Society" value={name} onChangeText={setName} maxLength={80} />

        <Text variant="smallStrong" style={styles.label}>
          Category
        </Text>
        <View style={styles.chips}>
          {EVENT_CATEGORIES.map(c => (
            <Chip key={c} label={c} dot={categoryColor(colors, c)} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>

        <View style={styles.field}>
          <Input label="About" placeholder="What does this society do?" value={about} onChangeText={setAbout} multiline maxLength={500} hint={`${about.length}/500`} />
        </View>

        <View style={styles.field}>
          <FormError message={error} />
          <Button title={societyId ? 'Save changes' : 'Create society'} onPress={save} loading={busy} disabled={!valid} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 20 },
  label: { marginTop: 22, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  field: { marginTop: 22, gap: 12 },
});
