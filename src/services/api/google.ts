import { GOOGLE_WEB_CLIENT_ID } from '../../config/env';

/**
 * "Continue with Google": Google sign-in -> Firebase credential -> Firebase ID token, which the
 * CampusHub API verifies. Needs the Firebase project (google-services.json + GOOGLE_WEB_CLIENT_ID).
 */
export async function getGoogleIdToken(): Promise<string> {
  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  const { GoogleAuthProvider, getAuth, signInWithCredential } = await import('@react-native-firebase/auth');

  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (!isSuccessResponse(res) || !res.data.idToken) {
    throw new Error('Sign-in cancelled');
  }
  const result = await signInWithCredential(getAuth(), GoogleAuthProvider.credential(res.data.idToken));
  return result.user.getIdToken();
}

export async function googleSignOut(): Promise<void> {
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    const { getAuth, signOut } = await import('@react-native-firebase/auth');
    await GoogleSignin.signOut();
    await signOut(getAuth());
  } catch {
    // not signed in with Google on this device
  }
}
