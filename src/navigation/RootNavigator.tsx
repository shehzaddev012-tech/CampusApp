import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { OnboardingScreen } from '../features/auth/OnboardingScreen';
import { ForgotPasswordScreen } from '../features/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../features/auth/ResetPasswordScreen';
import { SignInScreen } from '../features/auth/SignInScreen';
import { SignUpScreen } from '../features/auth/SignUpScreen';
import { VerifyCodeScreen } from '../features/auth/VerifyCodeScreen';
import { PendingApprovalScreen } from '../features/join/PendingApprovalScreen';
import { SelectUniversityScreen } from '../features/join/SelectUniversityScreen';
import { StudentDetailsScreen } from '../features/join/StudentDetailsScreen';
import { SplashScreen } from '../features/SplashScreen';
import { useAppHydrated, useAppStore } from '../store/appStore';
import { useSession } from '../store/sessionStore';
import { AppNavigator } from './AppNavigator';
import type { AuthStackParamList, JoinStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const JoinStack = createNativeStackNavigator<JoinStackParamList>();

function AuthNavigator() {
  const seen = useAppStore(s => s.hasSeenOnboarding);
  return (
    <AuthStack.Navigator
      initialRouteName={seen ? 'SignIn' : 'Onboarding'}
      screenOptions={{ headerShown: false, animation: 'fade' }}>
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} options={{ animation: 'slide_from_right' }} />
      <AuthStack.Screen name="VerifyCode" component={VerifyCodeScreen} options={{ animation: 'slide_from_right' }} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right' }} />
      <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ animation: 'slide_from_right' }} />
    </AuthStack.Navigator>
  );
}

function JoinNavigator() {
  return (
    <JoinStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <JoinStack.Screen name="SelectUniversity" component={SelectUniversityScreen} />
      <JoinStack.Screen name="StudentDetails" component={StudentDetailsScreen} />
    </JoinStack.Navigator>
  );
}

/**
 * Chooses the whole navigation tree from the session state machine,
 * so a user can never reach a screen they are not allowed to see.
 */
export function RootNavigator() {
  const status = useSession(s => s.status);
  const hydrated = useAppHydrated();

  if (status === 'booting' || !hydrated) {
    return <SplashScreen />;
  }

  switch (status) {
    case 'signedOut':
      return <AuthNavigator />;
    case 'needsUniversity':
      return <JoinNavigator />;
    case 'pending':
    case 'rejected':
      return <PendingApprovalScreen />;
    case 'active':
      return <AppNavigator />;
  }
}
