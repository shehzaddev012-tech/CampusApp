import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail, User } from 'lucide-react-native';

import { Button, GoogleButton, Input, Text } from '../../components/ui';
import { GOOGLE_SIGN_IN_ENABLED } from '../../config/env';
import type { AuthStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useSession } from '../../store/sessionStore';
import { useTheme } from '../../theme';
import { AuthPage, FormError } from './AuthPage';
import { EMAIL_RE, PasswordField, PasswordRules, passwordOk } from './authForm';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

export function SignUpScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const signInGoogle = useSession(s => s.signIn);
  const busyGoogle = useSession(s => s.busy);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = name.trim().length >= 2 && EMAIL_RE.test(email.trim()) && passwordOk(password) && confirm === password && !working;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    setWorking(true);
    setError(null);
    const address = email.trim();
    try {
      const sent = await backend.auth.register(name.trim(), address, password);
      navigation.navigate('VerifyCode', { email: sent.email, purpose: 'signup', resendAfterSeconds: sent.resendAfterSeconds });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'otp_cooldown') {
        // A code was just sent to this address: let the person enter it.
        const wait = (e.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds ?? 60;
        navigation.navigate('VerifyCode', { email: address.toLowerCase(), purpose: 'signup', resendAfterSeconds: wait });
      } else {
        setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setWorking(false);
    }
  };

  return (
    <AuthPage title="Create your account" subtitle="Use your own email. We will send you a code to confirm it." onBack={() => navigation.goBack()}>
      <Input label="Full name" icon={User} value={name} onChangeText={setName} placeholder="Ayesha Khan" autoCapitalize="words" autoComplete="name" textContentType="name" />
      <Input
        label="Email"
        icon={Mail}
        value={email}
        onChangeText={setEmail}
        placeholder="you@university.edu"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <View>
        <PasswordField label="Password" value={password} onChangeText={setPassword} placeholder="Choose a password" autoComplete="new-password" />
        <PasswordRules value={password} />
      </View>
      <PasswordField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Type it again"
        autoComplete="new-password"
        error={mismatch ? 'The passwords do not match.' : null}
      />

      <FormError message={error} />
      <Button title="Create account" onPress={submit} loading={working} disabled={!canSubmit} />

      {GOOGLE_SIGN_IN_ENABLED ? (
        <>
          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text variant="caption" color="textTertiary" style={styles.or}>
              or
            </Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>
          <GoogleButton onPress={signInGoogle} loading={busyGoogle} />
        </>
      ) : null}

      <View style={styles.switchRow}>
        <Text variant="body" color="textSecondary">
          Already have an account?{' '}
        </Text>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => navigation.navigate('SignIn')}>
          <Text variant="bodyStrong">Sign in</Text>
        </Pressable>
      </View>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  or: { marginHorizontal: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
});
