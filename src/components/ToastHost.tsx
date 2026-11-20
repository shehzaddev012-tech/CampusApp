import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { openEvent, openPost } from '../navigation/ref';
import { useToast } from '../store/toastStore';
import { PALETTE, useTheme } from '../theme';
import { Text } from './ui';

const VISIBLE_MS = 4500;

/** In-app banner that slides in from the top. Mounted once, above the navigator. */
export function ToastHost() {
  const toast = useToast(s => s.current);
  const hide = useToast(s => s.hide);
  const insets = useSafeAreaInsets();
  const { colors, radius } = useTheme();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => hide());
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toast, slide, hide]);

  if (!toast) {
    return null;
  }

  const dot = toast.tone === 'alert' ? colors.coral : toast.tone === 'success' ? PALETTE.green : colors.sky;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top: insets.top + 8,
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
        },
      ]}>
      <Pressable
        accessibilityRole="alert"
        onPress={() => {
          hide();
          if (toast.postId) {
            openPost(toast.postId);
          } else if (toast.eventId) {
            openEvent(toast.eventId);
          }
        }}
        style={[styles.card, { backgroundColor: PALETTE.ink, borderRadius: radius.lg }]}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <View style={styles.texts}>
          <Text variant="smallStrong" color={PALETTE.paper} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.body ? (
            <Text variant="small" color="rgba(247,246,240,0.75)" numberOfLines={2}>
              {toast.body}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  texts: { flex: 1 },
});
