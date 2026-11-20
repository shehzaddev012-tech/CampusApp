import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail } from 'lucide-react-native';

import { Button, Input } from '../../components/ui';
import type { AuthStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { AuthPage, FormError } from './AuthPage';
import { EMAIL_RE } from './authForm';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = EMAIL_RE.test(email.trim());

  const submit = async () => {
    if (!valid || working) {
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const sent = await backend.auth.forgotPassword(email.trim());
      navigation.navigate('ResetPassword', { email: sent.email, resendAfterSeconds: sent.resendAfterSeconds });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <AuthPage
      title="Forgot your password?"
      subtitle="Enter your email. If there is an account for it, we will send a code to choose a new password."
      onBack={() => navigation.goBack()}>
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
        autoFocus
      />
      <FormError message={error} />
      <Button title="Send code" onPress={submit} loading={working} disabled={!valid} />
    </AuthPage>
  );
}
