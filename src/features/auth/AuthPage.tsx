import React from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TopBar } from '../../components/ui';
import { GUTTER, useTheme } from '../../theme';
import { useKeepFocusedVisible } from './authForm';

/** Shared frame for the sign-up / code / password screens: back button, big title, scrolling form. */
export function AuthPage({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keep = useKeepFocusedVisible();
  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior="padding">
      <TopBar onBack={onBack} />
      <ScrollView
        ref={keep.ref}
        onScroll={keep.onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text variant="title1">{title}</Text>
        {subtitle ? (
          <Text variant="body" color="textSecondary" style={styles.sub}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.form}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** A red line for a failed step. */
export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <Text variant="small" color="danger" style={styles.error} accessibilityRole="alert">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingTop: 8 },
  sub: { marginTop: 8 },
  form: { marginTop: 24, gap: 16 },
  error: { marginTop: -4 },
});
