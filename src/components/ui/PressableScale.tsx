import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. Kept subtle on purpose. */
  scaleTo?: number;
}

/**
 * Pressable with a restrained press animation.
 * It is a single node, so layout styles (width, flex, alignment) behave like on a plain View.
 */
export function PressableScale({
  style,
  scaleTo = 0.98,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to: number) =>
    Animated.timing(scale, { toValue: to, duration: 110, useNativeDriver: true }).start();

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => {
        animate(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        animate(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}>
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}
