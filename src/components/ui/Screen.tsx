import React from 'react';
import { RefreshControlProps, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GUTTER, useTheme } from '../../theme';

interface Props {
  children: React.ReactNode;
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  /** Horizontal page padding (default 20). Pass 0 for edge-to-edge content. */
  padding?: number;
  /** Screen sits above the tab bar (which already reserves its own space). */
  tabScreen?: boolean;
  /** Draw behind the status bar (full-bleed art at the very top). */
  noTopInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

/** Base screen: Warm Paper background + safe-area handling + optional scrolling. */
export function Screen({
  children,
  scroll,
  padding = GUTTER,
  tabScreen,
  noTopInset,
  contentStyle,
  refreshControl,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const paddingTop = noTopInset ? 0 : insets.top + 8;
  const paddingBottom = tabScreen ? 32 : insets.bottom + 16;

  if (scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Keeps the status bar readable when content scrolls underneath it. */}
        {noTopInset ? null : (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: insets.top,
              backgroundColor: colors.background,
              opacity: 0.94,
              zIndex: 10,
            }}
          />
        )}
        <ScrollView
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[{ paddingTop, paddingBottom, paddingHorizontal: padding }, contentStyle]}>
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        { flex: 1, backgroundColor: colors.background, paddingTop, paddingBottom, paddingHorizontal: padding },
        contentStyle,
      ]}>
      {children}
    </View>
  );
}
