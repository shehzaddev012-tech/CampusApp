import React, { useState } from 'react';
import { Keyboard, Pressable, ScrollViewInstance, StyleSheet, TextInput, View } from 'react-native';
import { Eye, EyeOff, Lock } from 'lucide-react-native';

import { Input, Text } from '../../components/ui';
import { PALETTE, useTheme } from '../../theme';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The same rules the server enforces (it checks again). */
export const passwordRules = (pw: string) => [
  { label: '8+ characters', ok: pw.length >= 8 },
  { label: 'A letter', ok: /[A-Za-z]/.test(pw) },
  { label: 'A number', ok: /\d/.test(pw) },
];
export const passwordOk = (pw: string) => passwordRules(pw).every(r => r.ok);

/** Password field with a show / hide button. */
export function PasswordField({
  label = 'Password',
  value,
  onChangeText,
  error,
  placeholder,
  autoComplete = 'current-password',
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string | null;
  placeholder?: string;
  autoComplete?: 'current-password' | 'new-password';
}) {
  const { colors } = useTheme();
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;
  return (
    <Input
      label={label}
      icon={Lock}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? 'Your password'}
      secureTextEntry={!shown}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      textContentType={autoComplete === 'new-password' ? 'newPassword' : 'password'}
      error={error}
      right={
        <Pressable accessibilityRole="button" accessibilityLabel={shown ? 'Hide password' : 'Show password'} hitSlop={10} onPress={() => setShown(s => !s)}>
          <Icon size={20} color={colors.textTertiary} strokeWidth={2.1} />
        </Pressable>
      }
    />
  );
}

/** Live checklist under a new password: each rule turns green when met. */
export function PasswordRules({ value }: { value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.rules}>
      {passwordRules(value).map(r => (
        <View key={r.label} style={[styles.rule, { backgroundColor: r.ok ? colors.primary : colors.surfaceAlt }]}>
          <Text variant="caption" color={r.ok ? PALETTE.ink : 'textSecondary'}>
            {r.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * While the keyboard is open, keeps the field being typed in on screen. (Android does not scroll to it by itself
 * once the app draws edge to edge.) Pass the result's ef and onScroll to the ScrollView.
 */
export function useKeepFocusedVisible() {
  const ref = React.useRef<ScrollViewInstance>(null);
  const y = React.useRef(0);
  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const check = () => {
      const field = TextInput.State.currentlyFocusedInput();
      const scroll = ref.current;
      if (!field || !scroll) {
        return;
      }
      scroll.measureInWindow((_sx, sy, _sw, sh) => {
        field.measureInWindow((_fx, fy, _fw, fh) => {
          const over = fy + fh + 24 - (sy + sh);
          const under = sy + 8 - fy;
          if (over > 0) {
            scroll.scrollTo({ y: y.current + over, animated: true });
          } else if (under > 0) {
            scroll.scrollTo({ y: Math.max(0, y.current - under), animated: true });
          }
        });
      });
    };
    const show = Keyboard.addListener('keyboardDidShow', () => {
      check();
      timer ??= setInterval(check, 350);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    });
    return () => {
      show.remove();
      hide.remove();
      if (timer) {
        clearInterval(timer);
      }
    };
  }, []);
  return { ref, onScroll: (e: { nativeEvent: { contentOffset: { y: number } } }) => { y.current = e.nativeEvent.contentOffset.y; } };
}

/** Seconds left on a "send again" countdown, and a way to restart it. */
export function useCountdown(initial: number) {
  const [left, setLeft] = useState(initial);
  React.useEffect(() => {
    if (left <= 0) {
      return undefined;
    }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const styles = StyleSheet.create({
  rules: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rule: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
});
