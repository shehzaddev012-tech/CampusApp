import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';

interface Props {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  error?: boolean;
  editable?: boolean;
}

/** A row of boxes for a one-time code. One hidden field takes the typing (and paste), the boxes only show it. */
export function OtpInput({ value, onChange, length = 6, autoFocus, error, editable = true }: Props) {
  const { colors, radius } = useTheme();
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable accessibilityRole="none" onPress={() => ref.current?.focus()} style={styles.row}>
      {Array.from({ length }, (_, i) => {
        const char = value[i] ?? '';
        const active = focused && i === Math.min(value.length, length - 1);
        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                borderRadius: radius.lg - 2,
                backgroundColor: colors.surface,
                borderColor: error ? colors.danger : active ? colors.text : colors.border,
                borderWidth: active || error ? 1.5 : 1,
              },
            ]}>
            <Text variant="title1">{char}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={t => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        editable={editable}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
        accessibilityLabel={`${length}-digit code`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: { flex: 1, height: 60, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.02, color: 'transparent' },
});
