import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays, House, Images, UserRound, UsersRound } from 'lucide-react-native';

import { Text } from '../components/ui';
import type { IconType } from '../components/ui';
import { PALETTE, useTheme } from '../theme';

const PILL_HEIGHT = 32;

const ICONS: Record<string, IconType> = {
  Home: House,
  Events: CalendarDays,
  Photos: Images,
  Societies: UsersRound,
  Profile: UserRound,
};

/**
 * Flat bottom navigation, part of the page rather than floating above it.
 * Active tab: Campus Green pill behind a Deep Ink icon, plus a bold label.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const Icon = ICONS[route.name] ?? House;
        const label = descriptors[route.key].options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.item}>
            <View style={styles.pill}>
              {/* Mounted only while focused: a view created with its colour and radius together
                  renders rounded; changing the colour of an existing view loses the radius on Android. */}
              {focused ? <View style={[styles.pillBg, { backgroundColor: colors.primary }]} /> : null}
              <Icon
                size={22}
                color={focused ? PALETTE.ink : colors.textTertiary}
                strokeWidth={focused ? 2.4 : 1.9}
              />
            </View>
            <Text
              variant="caption"
              color={focused ? 'text' : 'textTertiary'}
              style={focused ? styles.activeLabel : undefined}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  pill: { width: 58, height: PILL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  pillBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: PILL_HEIGHT / 2,
  },
  activeLabel: { fontFamily: 'PlusJakartaSans_700Bold' },
});
