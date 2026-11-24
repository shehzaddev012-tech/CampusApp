import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Eye, Flag, Trash2, X } from 'lucide-react-native';

import { Avatar, Text } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useToast } from '../../store/toastStore';
import { confirm } from '../../utils/confirm';
import { reportContent } from '../../utils/report';
import { timeAgo } from '../../utils/time';

type Props = NativeStackScreenProps<AppStackParamList, 'StoryViewer'>;

const STORY_MS = 5000;
const WHITE = '#FFFFFF';

/** Full-screen stories. Tap the right side for the next one, the left side to go back. Each lasts 5 seconds. */
export function StoryViewerScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const show = useToast(s => s.show);
  const { people: initial, start } = route.params;
  const [people, setPeople] = useState(initial);
  const [pi, setPi] = useState(start);
  const [si, setSi] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const paused = useRef(false);

  const person = people[pi];
  const story = person?.stories[si];

  const next = useCallback(() => {
    if (!person) {
      return;
    }
    if (si < person.stories.length - 1) {
      setSi(si + 1);
    } else if (pi < people.length - 1) {
      setPi(pi + 1);
      setSi(0);
    } else {
      navigation.goBack();
    }
  }, [person, si, pi, people.length, navigation]);

  const back = useCallback(() => {
    if (si > 0) {
      setSi(si - 1);
    } else if (pi > 0) {
      const prev = people[pi - 1];
      setPi(pi - 1);
      setSi(prev ? Math.max(0, prev.stories.length - 1) : 0);
    } else {
      progress.setValue(0);
    }
  }, [si, pi, people, progress]);

  // One story: run the 5-second bar, tell the server it was seen, then move on.
  const storyId = story?.id;
  useEffect(() => {
    if (!storyId) {
      return;
    }
    progress.setValue(0);
    const run = Animated.timing(progress, { toValue: 1, duration: STORY_MS, easing: Easing.linear, useNativeDriver: false });
    run.start(({ finished }) => {
      if (finished && !paused.current) {
        next();
      }
    });
    if (!person?.mine) {
      backend.stories.markSeen(storyId).catch(() => undefined);
    }
    return () => run.stop();
    // `next` changes with the position; the bar must only restart when the story changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  if (!person || !story) {
    return <View style={styles.root} />;
  }

  const hold = (on: boolean) => {
    paused.current = on;
    if (on) {
      progress.stopAnimation();
    }
  };
  const resume = () => {
    paused.current = false;
    Animated.timing(progress, { toValue: 1, duration: STORY_MS, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (finished && !paused.current) {
        next();
      }
    });
  };

  const removeCurrent = async () => {
    hold(true);
    if (!(await confirm({ title: 'Delete this story?', message: 'It disappears for everyone right away.', confirmLabel: 'Delete' }))) {
      resume();
      return;
    }
    try {
      await backend.stories.remove(story.id);
      const left = people
        .map((p, i) => (i === pi ? { ...p, stories: p.stories.filter(s => s.id !== story.id) } : p))
        .filter(p => p.stories.length > 0);
      if (left.length === 0) {
        navigation.goBack();
        return;
      }
      const stillHere = left.findIndex(p => p.uid === person.uid);
      paused.current = false;
      setPeople(left);
      setPi(stillHere >= 0 ? stillHere : Math.min(pi, left.length - 1));
      setSi(0);
      show({ title: 'Story deleted', tone: 'success' });
    } catch (e) {
      show({ title: 'Could not delete', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
      resume();
    }
  };

  const showViewers = async () => {
    hold(true);
    try {
      const v = await backend.stories.viewers(story.id);
      Alert.alert(v.length === 0 ? 'No views yet' : `Seen by ${v.length}`, v.map(x => x.name).join('\n') || 'Nobody has looked at this story yet.', [{ text: 'OK', onPress: resume }], { onDismiss: resume });
    } catch {
      resume();
    }
  };

  const report = () => {
    hold(true);
    reportContent('story', story.id, 'story');
    setTimeout(resume, 400);
  };

  return (
    <View style={styles.root}>
      {story.image ? (
        <Image source={{ uri: story.image.url }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel={story.caption || `Story by ${person.name}`} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.textStory, { backgroundColor: story.bg || '#14231D' }]}>
          <Text variant="title2" align="center" style={styles.textStoryText}>
            {story.caption}
          </Text>
        </View>
      )}

      {/* Tap zones: left = back, right = next. Pressing and holding pauses. */}
      <View style={[StyleSheet.absoluteFill, styles.zones]}>
        <Pressable style={styles.left} onPress={back} onPressIn={() => hold(true)} onPressOut={() => paused.current && resume()} accessibilityLabel="Previous story" />
        <Pressable style={styles.right} onPress={next} onPressIn={() => hold(true)} onPressOut={() => paused.current && resume()} accessibilityLabel="Next story" />
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.bars}>
          {person.stories.map((s, i) => (
            <View key={s.id} style={styles.barTrack}>
              <Animated.View
                style={[styles.barFill, { width: i < si ? '100%' : i === si ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%' }]}
              />
            </View>
          ))}
        </View>
        <View style={styles.who}>
          <Avatar name={person.name} uri={person.photoUrl} size={34} />
          <View style={styles.whoText}>
            <Text variant="smallStrong" style={styles.white}>
              {person.mine ? 'Your story' : person.name}
            </Text>
            <Text variant="caption" style={styles.dim}>
              {timeAgo(story.createdAt)}
            </Text>
          </View>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <X size={26} color={WHITE} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
        {story.caption && story.image ? (
          <View style={styles.captionBox}>
            <Text variant="body" style={styles.white}>
              {story.caption}
            </Text>
          </View>
        ) : null}
        <View style={styles.actions}>
          {person.mine ? (
            <>
              <Pressable style={styles.action} onPress={showViewers} accessibilityRole="button" accessibilityLabel="Who saw this">
                <Eye size={20} color={WHITE} />
                <Text variant="smallStrong" style={styles.white}>
                  {story.viewCount ?? 0}
                </Text>
              </Pressable>
              <Pressable style={styles.action} onPress={removeCurrent} accessibilityRole="button" accessibilityLabel="Delete story">
                <Trash2 size={20} color={WHITE} />
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.action} onPress={report} accessibilityRole="button" accessibilityLabel="Report story">
              <Flag size={20} color={WHITE} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  zones: { flexDirection: 'row' },
  textStory: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  textStoryText: { color: WHITE, fontSize: 28, lineHeight: 38 },
  left: { flex: 1 },
  right: { flex: 2 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, gap: 10 },
  bars: { flexDirection: 'row', gap: 4 },
  barTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: WHITE },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  whoText: { flex: 1 },
  white: { color: WHITE },
  dim: { color: 'rgba(255,255,255,0.75)' },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 12 },
  captionBox: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, minWidth: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.55)' },
});
