import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Gift, Pencil, Plus, Ticket } from 'lucide-react-native';

import { Badge, Button, Card, EmptyState, IconButton, Input, SectionHeader, Skeleton, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useSession } from '../../store/sessionStore';
import { usePoints } from '../../store/pointsStore';
import { useToast } from '../../store/toastStore';
import { GUTTER, PALETTE, useTheme } from '../../theme';
import type { Redemption, Reward, WaitingRedemption } from '../../types/domain';
import { confirm } from '../../utils/confirm';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'Rewards'>;

export function RewardsScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const role = useSession(s => s.membership?.role);
  const isAdmin = role === 'uni_admin' || role === 'dept_admin';
  const show = useToast(s => s.show);
  const summary = usePoints(s => s.summary);

  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [balance, setBalance] = useState(0);
  const [mine, setMine] = useState<Redemption[]>([]);
  const [waiting, setWaiting] = useState<WaitingRedemption[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    try {
      const [list, my, wait] = await Promise.all([backend.rewards.list(), backend.rewards.mine(), isAdmin ? backend.rewards.waiting() : Promise.resolve([])]);
      setRewards(list.rewards);
      setBalance(list.balance);
      setMine(my);
      setWaiting(wait);
    } catch {
      setRewards(prev => prev ?? []);
    }
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const redeem = async (r: Reward) => {
    if (!(await confirm({ title: `Redeem ${r.title}?`, message: `${r.cost} points will be spent. You then show a code at the counter.`, confirmLabel: `Spend ${r.cost} points`, tone: 'neutral' }))) {
      return;
    }
    setBusy(r.id);
    try {
      const res = await backend.rewards.redeem(r.id);
      show({ title: 'Redeemed', body: `Your code is ${res.code}. Show it at the counter.`, tone: 'success' });
      await load();
    } catch (e) {
      show({ title: 'Could not redeem', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (d: Redemption) => {
    if (!(await confirm({ title: 'Cancel this reward?', message: `You get your ${d.cost} points back.`, confirmLabel: 'Cancel reward', cancelLabel: 'Keep it' }))) {
      return;
    }
    try {
      await backend.rewards.cancel(d.id);
      await load();
    } catch (e) {
      show({ title: 'Could not cancel', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  const handOver = async () => {
    if (code.trim().length < 8) {
      return;
    }
    try {
      const r = await backend.rewards.collect(code.trim());
      show({ title: 'Handed over', body: `${r.title} for ${r.student}`, tone: 'success' });
      setCode('');
      await load();
    } catch (e) {
      show({ title: 'Code not accepted', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };

  const pending = mine.filter(m => m.status === 'pending');
  const past = mine.filter(m => m.status !== 'pending').slice(0, 5);
  const points = summary?.balance ?? balance;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar
        title="Rewards"
        onBack={() => navigation.goBack()}
        right={isAdmin ? <IconButton icon={Plus} onPress={() => navigation.navigate('RewardForm')} accessibilityLabel="New reward" /> : undefined}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.balance, { backgroundColor: PALETTE.ink }]}>
          <Text variant="overline" color={PALETTE.green}>
            YOUR POINTS
          </Text>
          <Text variant="numeral" color={PALETTE.paper}>
            {points}
          </Text>
        </View>

        {pending.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="Waiting for you" />
            {pending.map(d => (
              <Card key={d.id} tone="sage" padding={16} style={styles.cardGap}>
                <Text variant="cardTitle">{d.title}</Text>
                <Text variant="caption" color="textSecondary">
                  Show this code at the counter
                </Text>
                <Text variant="display" style={styles.code} accessibilityLabel={`Code ${d.code}`}>
                  {d.code}
                </Text>
                <Button title="Cancel and get points back" variant="ghost" size="md" onPress={() => cancel(d)} />
              </Card>
            ))}
          </View>
        ) : null}

        {isAdmin ? (
          <View style={styles.block}>
            <SectionHeader title="Hand over a reward" eyebrow="Staff" />
            <Card padding={16}>
              <Text variant="small" color="textSecondary" style={styles.cardGap}>
                The student shows you a code like K7M2-9XQD. Type it here.
              </Text>
              <Input icon={Ticket} placeholder="K7M2-9XQD" value={code} onChangeText={t => setCode(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={9} />
              <View style={styles.cardGap}>
                <Button title="Hand over" icon={Check} onPress={handOver} disabled={code.trim().length < 8} />
              </View>
              {waiting.length > 0 ? (
                <View style={styles.waiting}>
                  <Text variant="smallStrong" style={styles.cardGap}>
                    Waiting to be collected ({waiting.length})
                  </Text>
                  {waiting.map(w => (
                    <View key={w.id} style={styles.waitRow}>
                      <Text variant="body" numberOfLines={1} style={styles.flex}>
                        {w.student} · {w.title}
                      </Text>
                      <Text variant="caption" color="textTertiary">
                        {timeAgo(w.createdAt)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          </View>
        ) : null}

        <View style={styles.block}>
          <SectionHeader eyebrow="Spend your points" title="Rewards" />
          {rewards === null ? (
            <Skeleton height={120} radius={20} />
          ) : rewards.length === 0 ? (
            <EmptyState icon={Gift} title="No rewards yet" message={isAdmin ? 'Tap + to add the first reward.' : 'Your university has not added rewards yet. Keep earning points!'} />
          ) : (
            rewards.map(r => (
              <Card key={r.id} padding={16} style={styles.cardGap}>
                <View style={styles.rewardHead}>
                  <View style={styles.flex}>
                    <Text variant="title3">{r.title}</Text>
                    {r.description ? (
                      <Text variant="small" color="textSecondary" style={styles.desc}>
                        {r.description}
                      </Text>
                    ) : null}
                  </View>
                  <Badge label={`${r.cost} pts`} tone="ink" />
                </View>
                <View style={styles.rewardFoot}>
                  <Text variant="caption" color="textTertiary" style={styles.flex}>
                    {r.soldOut ? 'Sold out' : r.stock !== null ? `${r.stock} left` : 'Always available'}
                    {!r.active ? ' · hidden from students' : ''}
                  </Text>
                  {isAdmin ? <IconButton icon={Pencil} size={36} onPress={() => navigation.navigate('RewardForm', { rewardId: r.id })} accessibilityLabel={`Edit ${r.title}`} /> : null}
                </View>
                {r.active ? (
                  <View style={styles.cardGap}>
                    <Button
                      title={r.soldOut ? 'Sold out' : points >= r.cost ? 'Redeem' : `${r.cost - points} more points needed`}
                      size="md"
                      variant={points >= r.cost && !r.soldOut ? 'primary' : 'soft'}
                      disabled={r.soldOut || points < r.cost}
                      loading={busy === r.id}
                      onPress={() => redeem(r)}
                    />
                  </View>
                ) : null}
              </Card>
            ))
          )}
        </View>

        {past.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="Earlier" />
            {past.map(d => (
              <View key={d.id} style={styles.waitRow}>
                <Text variant="body" numberOfLines={1} style={styles.flex}>
                  {d.title}
                </Text>
                <Badge label={d.status === 'collected' ? 'Collected' : 'Cancelled'} tone={d.status === 'collected' ? 'success' : 'neutral'} />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 16 },
  balance: { borderRadius: 24, padding: 20 },
  block: { marginTop: 28 },
  cardGap: { marginTop: 10 },
  code: { marginVertical: 10, letterSpacing: 2 },
  waiting: { marginTop: 18 },
  waitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  rewardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rewardFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  desc: { marginTop: 4 },
  flex: { flex: 1 },
});
