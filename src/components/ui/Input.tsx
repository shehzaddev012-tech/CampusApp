import React, { ReactNode, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { useTheme } from '../../theme';
import { Text } from './Text';
import type { IconType } from './types';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: IconType;
  error?: string | null;
  hint?: string;
  /** Something at the end of the field, for example a show/hide button. */
  right?: ReactNode;
}

export function Input({ label, icon: Icon, error, hint, right, onFocus, onBlur, ...rest }: Props) {
  const { colors, radius, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.text : colors.border;
  const multiline = !!rest.multiline;

  return (
    <View>
      {label ? (
        <Text variant="smallStrong" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          multiline && styles.fieldMulti,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderRadius: radius.lg - 2,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}>
        {Icon ? (
          <Icon size={19} color={focused ? colors.text : colors.textTertiary} strokeWidth={2.2} />
        ) : null}
        <TextInput
          {...rest}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.text}
          style={[
            typography.body,
            styles.input,
            multiline && styles.inputMulti,
            { color: colors.text },
            Icon ? styles.inputWithIcon : null,
          ]}
        />
        {right}
      </View>
      {error ? (
        <Text variant="small" color="danger" style={styles.msg}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" color="textSecondary" style={styles.msg}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8 },
  field: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, minHeight: 52 },
  fieldMulti: { minHeight: 140, alignItems: 'flex-start', paddingVertical: 14 },
  input: { flex: 1, paddingVertical: 0 },
  inputMulti: { textAlignVertical: 'top', minHeight: 110 },
  inputWithIcon: { marginLeft: 10 },
  msg: { marginTop: 6 },
});
