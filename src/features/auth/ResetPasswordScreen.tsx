import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge, Button, OtpInput, Text } from '../../components/ui';
import type { AuthStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { AuthPage, FormError } from './AuthPage';
import { PasswordField, PasswordRules, mmss, passwordOk, useCountdown } from './authForm';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

/** Enter the emailed code and choose a new password. */
export function ResetPasswordScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useCountdown(route.params.resendAfterSeconds);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const peek = useCallback(() => {
    backend.auth.devPeekCode(email).then(setDevCode);
  }, [email]);
  useEffect(peek, [peek]);

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = code.length === 6 && passwordOk(password) && confirm === password && !working;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await backend.auth.resetPassword(email, code, password);
      Alert.alert('Password changed', 'You can now sign in with your new password.', [{ text: 'Sign in', onPress: () => navigation.navigate('SignIn') }]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      if (e instanceof ApiError && e.code.startsWith('otp_')) {
        setCode('');
      }
    } finally {
      setWorking(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      const sent = await backend.auth.resendCode(email, 'reset');
      setWait(sent.resendAfterSeconds);
      setCode('');
      peek();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'otp_cooldown') {
        setWait((e.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds ?? 60);
      } else {
        setError(e instanceof ApiError ? e.message : 'Could not send a new code. Please try again.');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthPage title="Choose a new password" subtitle={`Enter the 6-digit code we emailed to ${email}, then your new password.`} onBack={() => navigation.goBack()}>
      <OtpInput value={code} onChange={v => { setCode(v); setError(null); }} autoFocus error={!!error && code.length === 0} editable={!working} />

      <View style={styles.resendRow}>
        {wait > 0 ? (
          <Text variant="small" color="textSecondary">
            Send a new code in {mmss(wait)}
          </Text>
        ) : (
          <Pressable accessibilityRole="button" disabled={resending} hitSlop={10} onPress={resend}>
            <Text variant="smallStrong">{resending ? 'Sending…' : 'Send a new code'}</Text>
          </Pressable>
        )}
      </View>

      <View>
        <PasswordField label="New password" value={password} onChangeText={setPassword} placeholder="Choose a password" autoComplete="new-password" />
        <PasswordRules value={password} />
      </View>
      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Type it again"
        autoComplete="new-password"
        error={mismatch ? 'The passwords do not match.' : null}
      />

      <FormError message={error} />
      <Button title="Reset password" onPress={submit} loading={working} disabled={!canSubmit} />

      {devCode ? (
        <Pressable accessibilityRole="button" onPress={() => setCode(devCode)} style={styles.dev}>
          <Badge label={`Dev server: tap to fill ${devCode}`} tone="warning" />
        </Pressable>
      ) : null}
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  resendRow: { alignItems: 'flex-start', marginTop: -4 },
  dev: { alignItems: 'center' },
});
