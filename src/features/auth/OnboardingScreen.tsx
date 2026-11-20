import React, { useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, PatternArt, Text } from '../../components/ui';
import type { PatternKind } from '../../components/ui';
import type { AuthStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { PALETTE, useTheme } from '../../theme';

interface Slide {
  key: string;
  kicker: string;
  title: string;
  body: string;
  bg: string;
  kind: PatternKind;
}

const SLIDES: Slide[] = [
  {
    key: 'one',
    kicker: '01  STAY IN THE LOOP',
    title: 'Your campus.\nYour people.\nYour moments.',
    body: 'Official notices, timetable changes and urgent alerts in one place. Never miss an update buried in a group chat again.',
    bg: PALETTE.green,
    kind: 'rings',
  },
  {
    key: 'two',
    kicker: '02  EVENTS',
    title: 'Every event,\none tap away.',
    body: 'RSVP, get your QR ticket and walk straight in. Guests are welcome with their own pass.',
    bg: PALETTE.sky,
    kind: 'grid',
  },
  {
    key: 'three',
    kicker: '03  MEMORIES',
    title: 'Memories that\nstay with you.',
    body: 'Shared photo albums for every event. Find your friends, vote the best shot and keep the day.',
    bg: PALETTE.coral,
    kind: 'stripes',
  },
];

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const markSeen = useAppStore(s => s.markOnboardingSeen);

  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = () => {
    markSeen();
    navigation.replace('SignIn');
  };

  const next = () => {
    if (last) {
      finish();
    } else {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  };

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.FlatList
        ref={listRef as React.Ref<FlatList<Slide>> as never}
        data={SLIDES}
        keyExtractor={s => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onEnd}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <PatternArt
              kind={item.kind}
              bg={item.bg}
              fg={PALETTE.ink}
              inset={insets.top + 56}
              style={[styles.art, { height: height * 0.5, paddingTop: insets.top }]}>
              <Text variant="overline" color={PALETTE.ink} style={styles.kicker}>
                {item.kicker}
              </Text>
            </PatternArt>
            <View style={styles.copy}>
              <Text variant="hero">{item.title}</Text>
              <Text variant="bodyLg" color="textSecondary" style={styles.body}>
                {item.body}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.skipWrap, { top: insets.top + 12 }]}>
        {!last ? (
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button" style={styles.skip}>
            <Text variant="smallStrong" color={PALETTE.ink}>
              Skip
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => {
            const input = [(i - 1) * width, i * width, (i + 1) * width];
            const w = scrollX.interpolate({ inputRange: input, outputRange: [8, 28, 8], extrapolate: 'clamp' });
            const o = scrollX.interpolate({ inputRange: input, outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' });
            return (
              <Animated.View
                key={s.key}
                style={[styles.dot, { width: w, opacity: o, backgroundColor: colors.text }]}
              />
            );
          })}
        </View>
        <Button title={last ? 'Get started' : 'Continue'} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  art: { borderBottomLeftRadius: 36, borderBottomRightRadius: 36, justifyContent: 'flex-end' },
  kicker: { padding: 24 },
  copy: { paddingHorizontal: 24, paddingTop: 32 },
  body: { marginTop: 14 },
  skipWrap: { position: 'absolute', right: 20 },
  skip: { height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: 'rgba(247,246,240,0.95)', alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 24, gap: 20 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
