import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Plus } from 'lucide-react-native';

import { Avatar, PressableScale, Text } from '../../components/ui';
import type { AppStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { useSession } from '../../store/sessionStore';
import { useTheme } from '../../theme';
import type { StoryPerson } from '../../types/domain';
import { firstName } from '../../utils/comingSoon';

const SIZE = 60;

/** The row of campus stories at the top of Home: "Your story" (with a plus), then everyone who posted in the last 24 hours. */
export function StoriesRail() {
  const { colors } = useTheme();
  const stack = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const me = useSession(s => s.user);
  const [people, setPeople] = useState<StoryPerson[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      backend.stories
        .list()
        .then(p => alive && setPeople(p))
        .catch(() => undefined); // the row is a bonus: it just stays as it was
      return () => {
        alive = false;
      };
    }, []),
  );

  const mine = people.find(p => p.mine);
  const others = people.filter(p => !p.mine);
  const open = (p: StoryPerson) => stack.navigate('StoryViewer', { people, start: people.indexOf(p) });

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {/* Your story: tap the picture to watch it; the little plus adds another one (like WhatsApp). */}
      <View style={styles.item}>
        <PressableScale
          onPress={() => (mine ? open(mine) : stack.navigate('AddStory'))}
          scaleTo={0.94}
          accessibilityRole="button"
          accessibilityLabel={mine ? 'View your story' : 'Add to your story'}
          style={styles.mineTap}>
          <View style={[styles.ring, { borderColor: mine ? colors.primary : colors.border }]}>
            <Avatar name={me?.name ?? 'You'} uri={me?.photoUrl} size={SIZE - 8} />
          </View>
          <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.name}>
            Your story
          </Text>
        </PressableScale>
        <PressableScale
          onPress={() => stack.navigate('AddStory')}
          scaleTo={0.9}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Add a story"
          style={[styles.plus, { backgroundColor: colors.primary, borderColor: colors.background }]}>
          <Plus size={14} color={colors.onPrimary} />
        </PressableScale>
      </View>
      {others.map(p => (
        <PressableScale key={p.uid} onPress={() => open(p)} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={`${p.name}'s story${p.hasUnseen ? ', new' : ''}`} style={styles.item}>
          <View style={[styles.ring, { borderColor: p.hasUnseen ? colors.primary : colors.border }]}>
            <Avatar name={p.name} uri={p.photoUrl} size={SIZE - 8} />
          </View>
          <Text variant="caption" color={p.hasUnseen ? 'text' : 'textSecondary'} numberOfLines={1} style={styles.name}>
            {firstName(p.name)}
          </Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -20, marginTop: 16, marginBottom: 24, flexGrow: 0 },
  row: { paddingHorizontal: 20, gap: 14 },
  item: { width: SIZE + 6, alignItems: 'center' },
  ring: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  mineTap: { alignItems: 'center' },
  plus: { position: 'absolute', right: 0, top: SIZE - 24, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: 6, maxWidth: SIZE + 6 },
});
