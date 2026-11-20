import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FlaskConical, Mail } from 'lucide-react-native';

import { Avatar, Badge, Button, GoogleButton, Input, Logo, PatternArt, Text } from '../../components/ui';
import { GOOGLE_SIGN_IN_ENABLED } from '../../config/env';
import type { AuthStackParamList } from '../../navigation/types';
import { backend } from '../../services';
import { ApiError } from '../../services/api/http';
import { useSession } from '../../store/sessionStore';
import { PALETTE, radius, useTheme } from '../../theme';
import { ROLE_LABEL } from '../../types/domain';
import type { DevAccount } from '../../types/domain';
import { FormError } from './AuthPage';
import { EMAIL_RE, PasswordField, useKeepFocusedVisible } from './authForm';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export function SignInScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keep = useKeepFocusedVisible();
  const signInGoogle = useSession(s => s.signIn);
  const signInDev = useSession(s => s.signInDev);
  const busyGoogle = useSession(s => s.busy);
  const storeError = useSession(s => s.error);
  const clearError = useSession(s => s.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<DevAccount[]>([]);
  const [devOpen, setDevOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    backend.auth.listDevAccounts().then(list => alive && setAccounts(list));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (storeError) {
      Alert.alert('Sign-in failed', storeError, [{ text: 'OK', onPress: clearError }]);
    }
  }, [storeError, clearError]);

  const canSubmit = EMAIL_RE.test(email.trim()) && password.length > 0 && !working;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const res = await backend.auth.signInWithPassword(email.trim(), password);
      if (res.status === 'otp_required') {
        navigation.navigate('VerifyCode', { email: res.email, purpose: 'login', resendAfterSeconds: res.resendAfterSeconds });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const showGoogle = GOOGLE_SIGN_IN_ENABLED;

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: PALETTE.ink }]} behavior="padding">
      <StatusBar barStyle="light-content" />
      <PatternArt kind="rings" bg={PALETTE.ink} fg={PALETTE.green} inset={insets.top} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Logo size={40} withWordmark onDark />
        <Text variant="display" color={PALETTE.paper} style={styles.headline}>
          Welcome{'\n'}
          <Text variant="display" color={PALETTE.green}>
            back.
          </Text>
        </Text>
      </PatternArt>

      <View style={[styles.sheet, { backgroundColor: colors.background, borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl }]}>
        <ScrollView
          ref={keep.ref}
          onScroll={keep.onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
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
          <View style={styles.gap}>
            <PasswordField value={password} onChangeText={setPassword} />
          </View>

          <View style={styles.forgotRow}>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text variant="smallStrong">Forgot password?</Text>
            </Pressable>
          </View>

          <FormError message={error} />
          <Button title="Sign in" onPress={submit} loading={working} disabled={!canSubmit} />

          {showGoogle ? (
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
              New to CampusHub?{' '}
            </Text>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => navigation.navigate('SignUp')}>
              <Text variant="bodyStrong">Create account</Text>
            </Pressable>
          </View>

          {accounts.length > 0 ? (
            <View style={styles.dev}>
              <Pressable onPress={() => setDevOpen(o => !o)} accessibilityRole="button">
                <Badge label={devOpen ? 'Hide developer test accounts' : 'Developer: test accounts'} tone="warning" icon={FlaskConical} />
              </Pressable>
              {devOpen
                ? accounts.map(a => (
                    <Pressable key={a.email} disabled={busyGoogle} onPress={() => signInDev(a.email)} style={[styles.account, { borderColor: colors.border }]}>
                      <Avatar name={a.name} size={34} />
                      <View style={styles.accountText}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {a.name}
                        </Text>
                        <Text variant="small" color="textSecondary" numberOfLines={1}>
                          {ROLE_LABEL[a.role]} · {a.universityId.toUpperCase()} · {a.email}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                : null}
            </View>
          ) : null}

          <Text variant="caption" color="textTertiary" align="center" style={styles.legal}>
            By continuing you agree to the Terms of Use and Privacy Policy.
          </Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingBottom: 48 },
  headline: { marginTop: 18 },
  sheet: { flex: 1, marginTop: -28 },
  sheetContent: { paddingHorizontal: 24, paddingTop: 26 },
  gap: { marginTop: 14 },
  forgotRow: { alignItems: 'flex-end', marginTop: 12, marginBottom: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  or: { marginHorizontal: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  dev: { marginTop: 22, gap: 8, alignItems: 'flex-start' },
  account: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  accountText: { flex: 1, marginLeft: 12 },
  legal: { marginTop: 22 },
});
