import React, { useMemo, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CalendarDays, Clock, Search, SearchX, UsersRound, X } from 'lucide-react-native';

import { Avatar, Chip, EmptyState, PressableScale, Text, TopBar } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { useEvents } from '../../store/eventStore';
import { sortFeed, useFeed } from '../../store/feedStore';
import { useSearchStore } from '../../store/searchStore';
import { useSocieties } from '../../store/societyStore';
import { GUTTER, categoryColor, useTheme } from '../../theme';
import { dayNumber, monthShort } from '../../utils/eventTime';
import { timeAgo } from '../../utils/time';
import { kindMeta } from '../feed/kind';

type Props = NativeStackScreenProps<AppStackParamList, 'Search'>;
type Scope = 'all' | 'updates' | 'events' | 'societies';

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'updates', label: 'Updates' },
  { key: 'events', label: 'Events' },
  { key: 'societies', label: 'Societies' },
];

const has = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle);

/** Search across updates, events and societies of the student's own university. */
export function SearchScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const posts = useFeed(s => s.posts);
  const allEvents = useEvents(s => s.events);
  const allSocieties = useSocieties(s => s.societies);
  const recents = useSearchStore(s => s.recents);
  const remember = useSearchStore(s => s.remember);
  const forget = useSearchStore(s => s.forget);
  const clear = useSearchStore(s => s.clear);

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (q.length < 2) {
      return null;
    }
    return {
      updates: sortFeed(posts).filter(
        p => has(p.title, q) || has(p.body, q) || has(p.source, q) || (p.channel ? has(p.channel, q) : false),
      ),
      events: allEvents.filter(
        e => has(e.title, q) || has(e.organizer, q) || has(e.venue, q) || has(e.category, q),
      ),
      societies: allSocieties.filter(s => has(s.name, q) || has(s.about, q) || has(s.category, q)),
    };
  }, [q, posts, allEvents, allSocieties]);

  const show = (s: Scope) => scope === 'all' || scope === s;
  const total = results ? results.updates.length + results.events.length + results.societies.length : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <TopBar onBack={() => navigation.goBack()} title="Search" />

      <View style={styles.searchWrap}>
        <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={19} color={colors.textTertiary} strokeWidth={2.2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => {
              remember(query);
              Keyboard.dismiss();
            }}
            returnKeyType="search"
            autoFocus
            autoCorrect={false}
            placeholder="Search updates, events, societies"
            placeholderTextColor={colors.textTertiary}
            selectionColor={colors.text}
            style={[typography.body, styles.input, { color: colors.text }]}
          />
          {query.length > 0 ? (
            <PressableScale onPress={() => setQuery('')} accessibilityLabel="Clear search" style={styles.clear}>
              <X size={18} color={colors.textSecondary} strokeWidth={2.4} />
            </PressableScale>
          ) : null}
        </View>

        {results ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scopes}
            contentContainerStyle={styles.scopesContent}>
            {SCOPES.map(s => (
              <Chip key={s.key} label={s.label} selected={scope === s.key} onPress={() => setScope(s.key)} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        {!results ? (
          recents.length > 0 ? (
            <View>
              <View style={styles.recentHead}>
                <Text variant="title3">Recent searches</Text>
                <PressableScale onPress={clear} accessibilityRole="button">
                  <Text variant="smallStrong" color="textSecondary">
                    Clear
                  </Text>
                </PressableScale>
              </View>
              {recents.map(r => (
                <PressableScale key={r} onPress={() => setQuery(r)} style={styles.recent}>
                  <Clock size={17} color={colors.textTertiary} strokeWidth={2.1} />
                  <Text variant="body" style={styles.recentText}>
                    {r}
                  </Text>
                  <PressableScale onPress={() => forget(r)} accessibilityLabel={`Remove ${r}`} style={styles.clear}>
                    <X size={16} color={colors.textTertiary} strokeWidth={2.4} />
                  </PressableScale>
                </PressableScale>
              ))}
            </View>
          ) : (
            <EmptyState
              icon={Search}
              title="Find anything on campus"
              message="Search notices, events and societies. Try “exam”, “cricket” or “photo”."
            />
          )
        ) : total === 0 ? (
          <EmptyState icon={SearchX} title="No results" message={`Nothing matches “${query.trim()}”. Try a shorter word.`} />
        ) : (
          <View>
            {show('updates') && results.updates.length > 0 ? (
              <Section title="Updates" count={results.updates.length}>
                {results.updates.map(p => {
                  const meta = kindMeta(p.kind, colors);
                  const Icon = meta.icon;
                  return (
                    <PressableScale
                      key={p.id}
                      onPress={() => {
                        remember(query);
                        navigation.navigate('PostDetail', { postId: p.id });
                      }}
                      style={styles.result}>
                      <View style={[styles.resultIcon, { backgroundColor: colors.surfaceAlt }]}>
                        <Icon size={18} color={colors.text} strokeWidth={2.2} />
                      </View>
                      <View style={styles.resultText}>
                        <Text variant="cardTitle" numberOfLines={1}>
                          {p.title}
                        </Text>
                        <Text variant="small" color="textSecondary" numberOfLines={1}>
                          {p.source} · {timeAgo(p.createdAt)}
                        </Text>
                      </View>
                    </PressableScale>
                  );
                })}
              </Section>
            ) : null}

            {show('events') && results.events.length > 0 ? (
              <Section title="Events" count={results.events.length}>
                {results.events.map(e => (
                  <PressableScale
                    key={e.id}
                    onPress={() => {
                      remember(query);
                      navigation.navigate('EventDetail', { eventId: e.id });
                    }}
                    style={styles.result}>
                    <View style={[styles.resultIcon, { backgroundColor: categoryColor(colors, e.category) }]}>
                      <CalendarDays size={18} color="#14231D" strokeWidth={2.2} />
                    </View>
                    <View style={styles.resultText}>
                      <Text variant="cardTitle" numberOfLines={1}>
                        {e.title}
                      </Text>
                      <Text variant="small" color="textSecondary" numberOfLines={1}>
                        {dayNumber(e.startsAt)} {monthShort(e.startsAt)} · {e.venue}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </Section>
            ) : null}

            {show('societies') && results.societies.length > 0 ? (
              <Section title="Societies" count={results.societies.length}>
                {results.societies.map(s => (
                  <PressableScale
                    key={s.id}
                    onPress={() => {
                      remember(query);
                      navigation.navigate('SocietyDetail', { societyId: s.id });
                    }}
                    style={styles.result}>
                    <Avatar name={s.name} size={40} square tint={categoryColor(colors, s.category)} />
                    <View style={styles.resultText}>
                      <Text variant="cardTitle" numberOfLines={1}>
                        {s.name}
                      </Text>
                      <View style={styles.sub}>
                        <UsersRound size={13} color={colors.textTertiary} />
                        <Text variant="small" color="textSecondary" style={styles.subText} numberOfLines={1}>
                          {s.memberCount} {s.memberCount === 1 ? 'member' : 'members'}
                        </Text>
                      </View>
                    </View>
                  </PressableScale>
                ))}
              </Section>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="overline" color="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()} · {count}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { paddingHorizontal: GUTTER, paddingTop: 14 },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 0, marginLeft: 10 },
  clear: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  scopes: { marginHorizontal: -GUTTER, marginTop: 12 },
  scopesContent: { paddingHorizontal: GUTTER, gap: 8 },
  content: { paddingHorizontal: GUTTER, paddingTop: 18, flexGrow: 1 },
  recentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  recent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  recentText: { flex: 1, marginLeft: 12 },
  section: { marginBottom: 22 },
  sectionTitle: { marginBottom: 6 },
  result: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  resultIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resultText: { flex: 1, marginLeft: 14 },
  sub: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  subText: { marginLeft: 5 },
});
