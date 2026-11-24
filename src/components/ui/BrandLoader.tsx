import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { PALETTE, useTheme } from '../../theme';
import { LogoMark } from './Logo';

interface Props {
  /** Width of the whole loader. The mark inside is about 60% of it. */
  size?: number;
  /** The ring needs to show on a dark background (splash). */
  onDark?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The loader of the app: the CampusHub mark, gently pulsing, inside a ring that keeps turning. */
export function BrandLoader({ size = 72, onDark, style }: Props) {
  const { colors } = useTheme();
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const turn = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    const beat = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    turn.start();
    beat.start();
    return () => {
      turn.stop();
      beat.stop();
    };
  }, [spin, pulse]);

  const mark = size * 0.6;
  const stroke = Math.max(2, size * 0.05);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ring = onDark ? PALETTE.green : colors.text;
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] });

  return (
    <View style={[styles.box, { width: size, height: size }, style]} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={ring} strokeOpacity={0.14} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={ring}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference * 0.26} ${circumference}`}
          />
        </Svg>
      </Animated.View>
      <Animated.View style={{ transform: [{ scale }] }}>
        <LogoMark size={mark} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
