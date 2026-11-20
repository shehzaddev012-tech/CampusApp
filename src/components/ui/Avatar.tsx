import React from 'react';
import { Image, View } from 'react-native';

import { PALETTE, readableOn, useTheme } from '../../theme';
import { Text } from './Text';

const TILE_COLORS = [PALETTE.coral, PALETTE.sky, PALETTE.lavender, PALETTE.yellow, PALETTE.green];

/** Deterministic colour for a name, picked from the category palette. */
export function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    // eslint-disable-next-line no-bitwise
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return TILE_COLORS[h % TILE_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  name: string;
  uri?: string | null;
  size?: number;
  /** Rounded square instead of a circle (societies and universities). */
  square?: boolean;
  /** Explicit tile colour instead of the name-based one. */
  tint?: string;
}

export function Avatar({ name, uri, size = 44, square, tint }: Props) {
  const { typography } = useTheme();
  const borderRadius = square ? size * 0.3 : size / 2;
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius }} />;
  }
  const bg = tint ?? colorFor(name);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        variant="bodyStrong"
        color={readableOn(bg)}
        style={{ fontFamily: typography.title3.fontFamily, fontSize: size * 0.36, lineHeight: size * 0.46 }}>
        {initials(name)}
      </Text>
    </View>
  );
}
