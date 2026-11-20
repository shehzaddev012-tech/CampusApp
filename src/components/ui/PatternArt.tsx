import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

export type PatternKind = 'grid' | 'stripes' | 'waves' | 'blocks' | 'dots' | 'rings' | 'circles';

interface Props {
  kind: PatternKind;
  /** Flat background colour. */
  bg: string;
  /** Shape colour (usually Deep Ink). */
  fg: string;
  /**
   * Keep the shapes this many px away from the top edge (e.g. below the status bar
   * or a floating button). The background still fills the whole view.
   */
  inset?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Flat geometric artwork used as event posters, album covers and society covers.
 * Built from solid shapes (no gradients) so each category gets its own graphic character.
 * The SVG is drawn at the measured pixel size of its container.
 */
export function PatternArt({ kind, bg, fg, inset = 0, style, children }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(prev => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  };

  const shapes = useMemo(() => {
    const w = size.w;
    const h = size.h - inset;
    if (w <= 0 || h <= 0) {
      return null;
    }
    const m = Math.min(w, h);
    switch (kind) {
      case 'grid': {
        const step = 26;
        const lines: React.ReactNode[] = [];
        for (let x = step; x < w; x += step) {
          lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke={fg} strokeOpacity={0.14} strokeWidth={1} />);
        }
        for (let y = step; y < h; y += step) {
          lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={w} y2={y} stroke={fg} strokeOpacity={0.14} strokeWidth={1} />);
        }
        return (
          <>
            {lines}
            <Circle cx={w * 0.82} cy={h * 0.3} r={m * 0.3} fill={fg} />
            <Circle cx={w * 0.82} cy={h * 0.3} r={m * 0.46} fill="none" stroke={fg} strokeOpacity={0.35} strokeWidth={1.5} />
          </>
        );
      }
      case 'stripes': {
        const lines: React.ReactNode[] = [];
        for (let i = -h; i < w; i += 24) {
          lines.push(<Line key={i} x1={i} y1={h} x2={i + h} y2={0} stroke={fg} strokeOpacity={0.13} strokeWidth={8} />);
        }
        return (
          <>
            {lines}
            <Circle cx={w * 0.84} cy={h * 0.26} r={m * 0.22} fill={fg} />
          </>
        );
      }
      case 'waves': {
        const paths = [0.5, 0.66, 0.82].map((p, i) => {
          const y = h * p;
          const a = m * 0.12;
          return (
            <Path
              key={i}
              d={`M0 ${y} Q ${w * 0.25} ${y - a} ${w * 0.5} ${y} T ${w} ${y}`}
              stroke={fg}
              strokeOpacity={0.4 - i * 0.08}
              strokeWidth={3}
              fill="none"
            />
          );
        });
        return (
          <>
            <Circle cx={w * 0.8} cy={h * 0.28} r={m * 0.26} fill={fg} />
            {paths}
          </>
        );
      }
      case 'blocks': {
        return (
          <>
            <Rect x={w * 0.56} y={0} width={w * 0.44} height={h * 0.56} fill={fg} />
            <Rect x={w * 0.56} y={h * 0.56} width={w * 0.2} height={h * 0.44} fill={fg} fillOpacity={0.16} />
            <Circle cx={w * 0.88} cy={h * 0.78} r={m * 0.12} fill={fg} fillOpacity={0.6} />
          </>
        );
      }
      case 'dots': {
        const dots: React.ReactNode[] = [];
        const step = 16;
        for (let x = step; x < w; x += step) {
          for (let y = step; y < h; y += step) {
            dots.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={2} fill={fg} fillOpacity={0.28} />);
          }
        }
        return (
          <>
            {dots}
            <Circle cx={w} cy={h} r={m * 0.5} fill={fg} />
          </>
        );
      }
      case 'rings': {
        return (
          <>
            {[0.3, 0.5, 0.7, 0.9].map((k, i) => (
              <Circle key={i} cx={w} cy={0} r={m * k * 1.1} fill="none" stroke={fg} strokeOpacity={0.4 - i * 0.06} strokeWidth={2} />
            ))}
            <Circle cx={w} cy={0} r={m * 0.24} fill={fg} />
          </>
        );
      }
      case 'circles':
      default:
        return (
          <>
            <Circle cx={w * 0.85} cy={h * 0.18} r={m * 0.5} fill={fg} fillOpacity={0.16} />
            <Circle cx={w * 0.18} cy={h} r={m * 0.42} fill="none" stroke={fg} strokeOpacity={0.4} strokeWidth={2} />
            <Circle cx={w * 0.85} cy={h * 0.18} r={m * 0.16} fill={fg} />
          </>
        );
    }
  }, [kind, fg, size, inset]);

  return (
    <View style={[styles.base, { backgroundColor: bg }, style]} onLayout={onLayout}>
      {shapes ? (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
          <G transform={`translate(0 ${inset})`}>{shapes}</G>
        </Svg>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
