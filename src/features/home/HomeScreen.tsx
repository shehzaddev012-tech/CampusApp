import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowUpRight,
  Bell,
  BookMarked,
  BookOpen,
  Briefcase,
  CalendarDays,
  FileText,
  Gift,
  IdCard,
  Images,
  Megaphone,
  MessageCircle,
  PackageSearch,
  Search,
  Sparkles,
  Ticket,
  Trophy,
  Users,
  UsersRound,
} from 'lucide-react-native';

import {
  Avatar,
  FadeIn,
  IconButton,
  PressableScale,
  Screen,
  SectionHeader,
  Skeleton,
  Text,
} from '../../components/ui';
import type { IconType } from '../../components/ui';
import type { AppStackParamList, MainTabParamList } from '../../navigation/types';
import { featuredEvent, upcomingEvents, useEvents } from '../../store/eventStore';
import { sortFeed, useFeed } from '../../store/feedStore';
import { selectUnreadCount, useNotifications } from '../../store/notificationStore';
import { usePoints } from '../../store/pointsStore';
import { useSession } from '../../store/sessionStore';
import { PALETTE, radius, useTheme } from '../../theme';
import { firstName, greeting } from '../../utils/comingSoon';
import { EventRailCard, FeaturedEventCard } from '../events/EventCard';
import { KindFilter, KindTabs } from '../feed/KindTabs';
import { UpdateRow } from './UpdateRow';

const HOME_UPDATES = 4;

export function HomeScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stack = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const user = useSession(s => s.user);
  const university = useSession(s => s.university);
  const membership = useSession(s => s.membership);
  const posts = useFeed(s => s.posts);
  const feedStatus = useFeed(s => s.status);
  const unread = useNotifications(selectUnreadCount);
  const points = usePoints(s => s.summary);
  const events = useEvents(s => s.events);
  const featured = useMemo(() => featuredEvent(events), [events]);
  const railEvents = useMemo(
    () => upcomingEvents(events).filter(e => e.id !== featured?.id).slice(0, 6),
    [events, featured],
  );
  const thisWeek = useMemo(
    () => upcomingEvents(events).filter(e => e.startsAt < Date.now() + 7 * 24 * 3_600_000).length,
    [events],
  );
  const [filter, setFilter] = useState<KindFilter>('all');
  const { width } = useWindowDimensions();
  // Both mosaic rows share the same column split so their edges line up.
  const colA = Math.round((width - 40 - 12) * 0.54);
  const colB = width - 40 - 12 - colA;

  const updates = useMemo(
    () => sortFeed(posts).filter(p => filter === 'all' || p.kind === filter).slice(0, HOME_UPDATES),
    [posts, filter],
  );

  return (
    <Screen scroll tabScreen>
      {/* Header: university identity, notifications, profile */}
      <View style={styles.header}>
        <Avatar
          name={university?.name ?? 'CH'}
          size={40}
          square
          tint={colors.university}
        />
        <View style={styles.headerText}>
          <Text variant="overline" color="textSecondary">
            {(university?.fullName ?? 'Your campus').toUpperCase()}
          </Text>
          <Text variant="smallStrong" numberOfLines={1}>
            {membershipLine(membership?.department, membership?.batch)}
          </Text>
        </View>
        <IconButton icon={Search} onPress={() => stack.navigate('Search')} accessibilityLabel="Search" />
        <View style={styles.bellGap}>
          <IconButton icon={MessageCircle} onPress={() => stack.navigate('Chats')} accessibilityLabel="Messages" />
        </View>
        <View style={styles.bellGap}>
          <IconButton
            icon={Bell}
            dot={unread > 0}
            onPress={() => stack.navigate('Notifications')}
            accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          />
        </View>
      </View>

      {/* Hero */}
      <FadeIn>
        <Text variant="smallStrong" color="textSecondary" style={styles.greeting}>
          {greeting()}, {firstName(user?.name)}
        </Text>
        <Text variant="display">
          Life happens{'\n'}
          <Text
            variant="display"
            style={{ backgroundColor: colors.primary, color: PALETTE.ink }}>
            on campus.
          </Text>
        </Text>
        <Text variant="bodyLg" color="textSecondary" style={styles.heroSub}>
          Find what's happening. Meet your people.
        </Text>
      </FadeIn>

      {featured ? (
        <FadeIn key={featured.id} delay={120} style={styles.featured}>
          <FeaturedEventCard event={featured} />
        </FadeIn>
      ) : (
        <View style={styles.featured} />
      )}

      {/* What's happening */}
      {railEvents.length > 0 ? (
        <>
          <SectionHeader
            eyebrow="Coming up"
            title="What's happening"
            actionLabel="All events"
            onAction={() => navigation.navigate('Events')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.rail}
            contentContainerStyle={styles.railContent}>
            {railEvents.map(e => (
              <EventRailCard key={e.id} event={e} />
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* Quick access: a mosaic, not a row of identical icons */}
      <SectionHeader eyebrow="Jump to" title="Quick access" />
      <View style={styles.mosaic}>
        <View style={styles.mosaicTop}>
          <Tile
            style={{ width: colA }}
            bg={colors.primary}
            fg={PALETTE.ink}
            icon={CalendarDays}
            title="Events"
            sub={`${thisWeek} this week`}
            onPress={() => navigation.navigate('Events')}
          />
          <View style={[styles.tileCol, { width: colB }]}>
            <Tile
              style={styles.tileSmall}
              bg={colors.inverse}
              fg={colors.onInverse}
              icon={UsersRound}
              title="Societies"
              compact
              onPress={() => navigation.navigate('Societies')}
            />
            <Tile
              style={styles.tileSmall}
              bg={colors.sky}
              fg={PALETTE.ink}
              icon={Images}
              title="Photos"
              compact
              onPress={() => navigation.navigate('Photos')}
            />
          </View>
        </View>
        <View style={styles.mosaicBottom}>
          <Tile
            style={{ width: colA }}
            bg={colors.yellow}
            fg={PALETTE.ink}
            icon={Ticket}
            title="Guest passes"
            compact
            onPress={() => stack.navigate('MyTickets')}
          />
          <Tile
            style={{ width: colB }}
            bg={colors.lavender}
            fg={PALETTE.ink}
            icon={Megaphone}
            title="Notices"
            compact
            onPress={() => stack.navigate('Feed')}
          />
        </View>
      </View>

      {/* Campus life: points, rewards, lost & found, student card */}
      <SectionHeader eyebrow="Earn and explore" title="Campus life" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.lifeRail}>
        <LifeCard
          bg={PALETTE.ink}
          fg={PALETTE.paper}
          icon={Sparkles}
          title="My points"
          sub={points ? `${points.balance} pts · ${points.level.name}` : 'Level up'}
          onPress={() => stack.navigate('Points')}
        />
        <LifeCard bg={colors.yellow} fg={PALETTE.ink} icon={Trophy} title="Leaderboard" sub="Who is on top" onPress={() => stack.navigate('Leaderboard')} />
        <LifeCard bg={colors.primary} fg={PALETTE.ink} icon={Gift} title="Rewards" sub="Spend your points" onPress={() => stack.navigate('Rewards')} />
        <LifeCard bg={colors.coral} fg={PALETTE.ink} icon={PackageSearch} title="Lost & Found" sub="Find or post" onPress={() => stack.navigate('LostFound')} />
        <LifeCard bg={colors.sky} fg={PALETTE.ink} icon={IdCard} title="Student card" sub="Your digital ID" onPress={() => stack.navigate('StudentCard')} />
      </ScrollView>

      {/* Study and career */}
      <SectionHeader eyebrow="Learn and grow" title="Study and career" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.lifeRail}>
        <LifeCard bg={colors.lavender} fg={PALETTE.ink} icon={BookOpen} title="Notes" sub="Notes and past papers" onPress={() => stack.navigate('Notes')} />
        <LifeCard bg={colors.yellow} fg={PALETTE.ink} icon={BookMarked} title="Book market" sub="Buy and sell" onPress={() => stack.navigate('Books')} />
        <LifeCard bg={colors.primary} fg={PALETTE.ink} icon={Users} title="Study groups" sub="Study together" onPress={() => stack.navigate('Groups')} />
        <LifeCard bg={PALETTE.ink} fg={PALETTE.paper} icon={Briefcase} title="Jobs" sub="Internships and jobs" onPress={() => stack.navigate('Jobs')} />
        <LifeCard bg={colors.coral} fg={PALETTE.ink} icon={FileText} title="My CV" sub="Build and share" onPress={() => stack.navigate('Cv')} />
      </ScrollView>

      {/* Campus updates */}
      <SectionHeader
        eyebrow="Latest"
        title="Campus updates"
        actionLabel="See all"
        onAction={() => stack.navigate('Feed')}
      />
      <KindTabs value={filter} onChange={setFilter} />
      <View style={styles.updates}>
        {feedStatus === 'loading' ? (
          <View style={styles.skeletons}>
            {[0, 1, 2].map(i => (
              <Skeleton key={i} height={86} radius={16} />
            ))}
          </View>
        ) : updates.length === 0 ? (
          <Text variant="body" color="textSecondary" style={styles.noUpdates}>
            Nothing here yet.
          </Text>
        ) : (
          updates.map((p, i) => (
            <UpdateRow
              key={p.id}
              post={p}
              last={i === updates.length - 1}
              onPress={() => stack.navigate('PostDetail', { postId: p.id })}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

function LifeCard({ bg, fg, icon: Icon, title, sub, onPress }: { bg: string; fg: string; icon: IconType; title: string; sub: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} style={[styles.lifeCard, { backgroundColor: bg }]}>
      <Icon size={24} color={fg} strokeWidth={2} />
      <View>
        <Text variant="cardTitle" color={fg} numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" color={fg} numberOfLines={1} style={styles.tileSub}>
          {sub}
        </Text>
      </View>
    </PressableScale>
  );
}

function membershipLine(department?: string, batch?: string): string {
  if (department && batch) {
    return `${department} · Batch ${batch}`;
  }
  return 'Welcome back';
}

interface TileProps {
  bg: string;
  fg: string;
  icon: IconType;
  title: string;
  sub?: string;
  compact?: boolean;
  onPress: () => void;
  style?: object;
}

function Tile({ bg, fg, icon: Icon, title, sub, compact, onPress, style }: TileProps) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.tile, { backgroundColor: bg }, style]}>
      <View style={styles.tileTop}>
        <Icon size={compact ? 20 : 26} color={fg} strokeWidth={2} />
        <ArrowUpRight size={18} color={fg} strokeWidth={2.3} />
      </View>
      <View>
        <Text variant={compact ? 'cardTitle' : 'title2'} color={fg}>
          {title}
        </Text>
        {sub ? (
          <Text variant="small" color={fg} style={styles.tileSub}>
            {sub}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  lifeRail: { paddingHorizontal: 20, gap: 12 },
  lifeCard: { width: 156, height: 124, borderRadius: 22, padding: 16, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  headerText: { flex: 1, marginLeft: 12, marginRight: 8 },
  bellGap: { marginLeft: 8 },

  greeting: { marginBottom: 10 },
  heroSub: { marginTop: 12 },
  featured: { marginTop: 24, marginBottom: 36 },

  rail: { marginHorizontal: -20, marginBottom: 36 },
  railContent: { paddingHorizontal: 20 },

  mosaic: { gap: 12, marginBottom: 36 },
  mosaicTop: { flexDirection: 'row', gap: 12, height: 184 },
  tileCol: { gap: 12 },
  tileSmall: { flex: 1 },
  mosaicBottom: { flexDirection: 'row', gap: 12, height: 84 },
  tile: { borderRadius: radius.xl, padding: 16, justifyContent: 'space-between' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tileSub: { opacity: 0.75, marginTop: 2 },

  updates: { marginTop: 8 },
  skeletons: { gap: 12, marginTop: 8 },
  noUpdates: { paddingVertical: 24 },
});
