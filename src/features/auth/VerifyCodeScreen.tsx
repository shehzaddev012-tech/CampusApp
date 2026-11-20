import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Badge, Button, OtpInput, Text } from '../../components/ui';
import type { AuthStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { AuthPage, FormError } from './AuthPage';
import { mmss, useCountdown } from './authForm';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyCode'>;

const COPY = {
  signup: { title: 'Check your email', sub: 'We sent a 6-digit code to' },
  login: { title: 'Confirm it is you', sub: 'For your safety we sent a sign-in code to' },
} as const;

/** Enter the code from the email. Used to finish sign-up and the second step of sign-in. */
export function VerifyCodeScreen({ navigation, route }: Props) {
  const { email, purpose } = route.params;
  const [code, setCode] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useCountdown(route.params.resendAfterSeconds);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const peek = useCallback(() => {
    backend.auth.devPeekCode(email).then(setDevCode);
  }, [email]);
  useEffect(peek, [peek]);

  const submit = useCallback(
    async (value: string) => {
      if (value.length !== 6 || working) {
        return;
      }
      setWorking(true);
      setError(null);
      try {
        if (purpose === 'signup') {
          await backend.auth.verifyEmail(email, value);
        } else {
          await backend.auth.verifyLoginCode(email, value);
        }
        // Signed in: the session state machine takes over from here.
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
        setCode('');
        setWorking(false);
      }
    },
    [email, purpose, working],
  );

  const onChange = (v: string) => {
    setCode(v);
    setError(null);
    if (v.length === 6) {
      submit(v);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      const sent = await backend.auth.resendCode(email, purpose);
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
    <AuthPage title={COPY[purpose].title} subtitle={`${COPY[purpose].sub} ${email}`} onBack={() => navigation.goBack()}>
      <OtpInput value={code} onChange={onChange} autoFocus error={!!error} editable={!working} />
      <FormError message={error} />
      <Button title="Verify" onPress={() => submit(code)} loading={working} disabled={code.length !== 6} />

      <View style={styles.resendRow}>
        {wait > 0 ? (
          <Text variant="body" color="textSecondary">
            Send a new code in {mmss(wait)}
          </Text>
        ) : (
          <Pressable accessibilityRole="button" disabled={resending} hitSlop={10} onPress={resend}>
            <Text variant="bodyStrong">{resending ? 'Sending…' : 'Send a new code'}</Text>
          </Pressable>
        )}
      </View>
      <Text variant="caption" color="textTertiary" align="center">
        The email can take a minute. Check your spam folder too. The code works for 10 minutes.
      </Text>

      {devCode ? (
        <Pressable accessibilityRole="button" onPress={() => onChange(devCode)} style={styles.dev}>
          <Badge label={`Dev server: tap to fill ${devCode}`} tone="warning" />
        </Pressable>
      ) : null}
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  resendRow: { alignItems: 'center', marginTop: 4 },
  dev: { alignItems: 'center' },
});
