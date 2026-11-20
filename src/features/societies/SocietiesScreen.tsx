import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarDays, Check, Plus, Search, Users } from 'lucide-react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  FadeIn,
  IconButton,
  Input,
  PatternArt,
  PressableScale,
  Screen,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  Text,
} from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useSession } from '../../store/sessionStore';
import { useSocieties } from '../../store/societyStore';
import { categoryColor, radius, useTheme } from '../../theme';
import { Society } from '../../types/domain';
import { dayNumber, monthShort } from '../../utils/eventTime';
import { categoryArt } from '../events/eventArt';

const GAP = 12;

const nextLabel = (s: Society) => (s.nextEvent ? `${s.nextEvent.title} · ${dayNumber(s.nextEvent.startsAt)} ${monthShort(s.nextEvent.startsAt)}` : 'No event planned');

export function SocietiesScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const societies = useSocieties(s => s.societies);
  const status = useSocieties(s => s.status);
  const toggleJoin = useSocieties(s => s.toggleJoin);
  const role = useSession(s => s.membership?.role);
  const isAdmin = role === 'uni_admin' || role === 'dept_admin';
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const all = societies.filter(s => !q || s.name.toLowerCase().includes(q) || s.about.toLowerCase().includes(q));
  const featured = societies.slice(0, 3);
  const cardWidth = (width - 40 - GAP) / 2;
  const open = (s: Society) => nav.navigate('SocietyDetail', { societyId: s.id });

  return (
    <Screen scroll tabScreen>
      <ScreenHeader
        title="Societies"
        subtitle="Find your people"
        right={isAdmin ? <IconButton icon={Plus} onPress={() => nav.navigate('SocietyForm')} accessibilityLabel="Create a society" /> : undefined}
      />
      <Input icon={Search} placeholder="Search societies" value={query} onChangeText={setQuery} />

      {status !== 'ready' && societies.length === 0 ? (
        <View style={styles.loading}>
          <Skeleton height={190} radius={24} />
          <Skeleton height={120} radius={20} style={styles.skel} />
        </View>
      ) : societies.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No societies yet"
          message={isAdmin ? 'Create the first society for your university.' : 'Societies will appear here once your university creates them.'}
          actionLabel={isAdmin ? 'Create a society' : undefined}
          onAction={isAdmin ? () => nav.navigate('SocietyForm') : undefined}
        />
      ) : (
        <>
          {!q ? (
            <FadeIn style={styles.section}>
              <SectionHeader eyebrow="Discover" title="Featured communities" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
                {featured.map(s => (
                  <CoverCard key={s.id} society={s} onOpen={() => open(s)} onToggle={() => toggleJoin(s)} />
                ))}
              </ScrollView>
            </FadeIn>
          ) : null}

          <SectionHeader eyebrow={`${all.length} societies`} title="All societies" />
          {all.length === 0 ? (
            <Text variant="body" color="textSecondary">
              Nothing matches "{query.trim()}".
            </Text>
          ) : (
            <View style={styles.grid}>
              {all.map(s => {
                const tint = categoryColor(colors, s.category);
                return (
                  <Card key={s.id} padding={14} onPress={() => open(s)} style={{ width: cardWidth }}>
                    <Avatar name={s.name} size={48} square tint={tint} />
                    <Text variant="cardTitle" numberOfLines={2} style={styles.gridName}>
                      {s.name}
                    </Text>
                    <View style={styles.meta}>
                      <Users size={13} color={colors.textTertiary} />
                      <Text variant="caption" color="textSecondary" style={styles.metaText}>
                        {s.memberCount} {s.memberCount === 1 ? 'member' : 'members'}
                      </Text>
                    </View>
                    <View style={styles.meta}>
                      <CalendarDays size={13} color={colors.textTertiary} />
                      <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.metaText}>
                        {nextLabel(s)}
                      </Text>
                    </View>
                    <Button
                      title={s.myRole === 'head' ? 'Head' : s.joined ? 'Joined' : 'Join'}
                      variant={s.joined ? 'soft' : 'primary'}
                      icon={s.joined ? Check : Plus}
                      size="md"
                      onPress={() => (s.myRole === 'head' ? open(s) : toggleJoin(s))}
                      style={styles.joinBtn}
                    />
                  </Card>
                );
              })}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

function CoverCard({ society, onOpen, onToggle }: { society: Society; onOpen: () => void; onToggle: () => void }) {
  const { colors } = useTheme();
  const art = categoryArt(colors, society.category);
  const joinBg = society.joined ? colors.surfaceAlt : colors.text;
  const joinFg = society.joined ? colors.text : colors.background;
  return (
    <PressableScale
      onPress={onOpen}
      scaleTo={0.98}
      accessibilityRole="button"
      style={[styles.cover, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xxl }]}>
      {/* Artwork on its own: text never sits on the graphic shapes. */}
      <PatternArt kind={art.kind} bg={art.bg} fg={art.fg} style={styles.coverArt}>
        <Badge label={society.category} tone="ink" />
      </PatternArt>
      <View style={styles.coverBody}>
        <Text variant="title3" numberOfLines={1}>
          {society.name}
        </Text>
        <Text variant="small" color="textSecondary" numberOfLines={1} style={styles.coverAbout}>
          {society.memberCount} members{society.about ? ` · ${society.about}` : ''}
        </Text>
        <View style={styles.coverFoot}>
          <Text variant="smallStrong" numberOfLines={1} style={styles.coverNext}>
            {society.nextEvent ? `Next · ${nextLabel(society)}` : 'No event planned'}
          </Text>
          {society.myRole === 'head' ? (
            <Badge label="You lead" tone="primary" />
          ) : (
            <PressableScale onPress={onToggle} scaleTo={0.95} accessibilityRole="button" style={[styles.pill, { backgroundColor: joinBg }]}>
              <Text variant="smallStrong" color={joinFg}>
                {society.joined ? 'Joined' : 'Join'}
              </Text>
            </PressableScale>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 28 },
  skel: { marginTop: 16 },
  section: { marginTop: 28 },
  rail: { marginHorizontal: -20, marginBottom: 32 },
  railContent: { paddingHorizontal: 20, gap: 14 },
  cover: { width: 292, borderWidth: 1, overflow: 'hidden' },
  coverArt: { height: 124, padding: 16 },
  coverBody: { padding: 16 },
  coverAbout: { marginTop: 3 },
  coverFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  coverNext: { flex: 1, marginRight: 10 },
  pill: { height: 34, paddingHorizontal: 18, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: 4 },
  gridName: { marginTop: 12, marginBottom: 6, minHeight: 44 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { marginLeft: 5, flexShrink: 1 },
  joinBtn: { marginTop: 14 },
});
