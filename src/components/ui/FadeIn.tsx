import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  /** Delay in ms, used to stagger sections. */
  delay?: number;
  /** Start offset in px (content rises into place). */
  distance?: number;
  style?: StyleProp<ViewStyle>;
}

/** Soft fade-and-rise on mount. Native-driven, so it never blocks the JS thread. */
export function FadeIn({ children, delay = 0, distance = 10, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 420, delay, useNativeDriver: true }).start();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}
