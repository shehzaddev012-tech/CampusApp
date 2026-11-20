import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Lock } from 'lucide-react-native';

import { Button, EmptyState, Input, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useSession } from '../../store/sessionStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, useTheme } from '../../theme';
import { FormError } from '../auth/AuthPage';

type Props = NativeStackScreenProps<AppStackParamList, 'RewardForm'>;

/** Admin: add a reward students can buy with points, or change one. */
export function RewardFormScreen({ navigation, route }: Props) {
  const rewardId = route.params?.rewardId;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const role = useSession(s => s.membership?.role);
  const show = useToast(s => s.show);
  const isAdmin = role === 'uni_admin' || role === 'dept_admin';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(!!rewardId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rewardId) {
      return;
    }
    backend.rewards
      .list()
      .then(({ rewards }) => {
        const r = rewards.find(x => x.id === rewardId);
        if (r) {
          setTitle(r.title);
          setDescription(r.description);
          setCost(String(r.cost));
          setStock(r.stock === null ? '' : String(r.stock));
          setActive(r.active);
        }
      })
      .finally(() => setLoading(false));
  }, [rewardId]);

  if (!isAdmin) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TopBar close title="Reward" onBack={() => navigation.goBack()} />
        <EmptyState icon={Lock} title="Admins only" message="Only university admins manage rewards." />
      </View>
    );
  }

  const costNumber = parseInt(cost, 10);
  const stockNumber = stock.trim() === '' ? null : parseInt(stock, 10);
  const valid = title.trim().length >= 2 && Number.isFinite(costNumber) && costNumber >= 1 && costNumber <= 100000 && (stockNumber === null || (Number.isFinite(stockNumber) && stockNumber >= 0)) && !loading;

  const save = async () => {
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input = { title: title.trim(), description: description.trim(), cost: costNumber, stock: stockNumber };
      if (rewardId) {
        await backend.rewards.update(rewardId, { ...input, active });
      } else {
        await backend.rewards.create(input);
      }
      show({ title: rewardId ? 'Saved' : 'Reward added', tone: 'success' });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar close title={rewardId ? 'Edit reward' : 'New reward'} onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Input label="Name" placeholder="e.g. Free coffee" value={title} onChangeText={setTitle} maxLength={80} />
        <View style={styles.field}>
          <Input label="Description" placeholder="What does the student get, and where?" value={description} onChangeText={setDescription} multiline maxLength={300} />
        </View>
        <View style={styles.field}>
          <Input label="Cost in points" placeholder="e.g. 40" value={cost} onChangeText={t => setCost(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} />
        </View>
        <View style={styles.field}>
          <Input label="How many are available (optional)" placeholder="Leave empty for no limit" value={stock} onChangeText={t => setStock(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={7} />
        </View>
        {rewardId ? (
          <View style={[styles.field, styles.switchRow]}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">Visible to students</Text>
              <Text variant="small" color="textSecondary">
                Turn off to hide it without losing its history.
              </Text>
            </View>
            <Switch value={active} onValueChange={setActive} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={active ? '#14231D' : '#FFFFFF'} />
          </View>
        ) : null}
        <View style={styles.field}>
          <FormError message={error} />
          <Button title={rewardId ? 'Save changes' : 'Add reward'} onPress={save} loading={busy} disabled={!valid} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 20 },
  field: { marginTop: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, marginRight: 12 },
});
