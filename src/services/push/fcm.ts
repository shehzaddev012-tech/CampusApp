/**
 * Firebase Cloud Messaging token. Firebase is optional until the Firebase project exists
 * (android/app/google-services.json), so every call here fails soft: with no Firebase the
 * answer is simply "no token", and notifications still arrive through the in-app inbox.
 */
export async function getFcmToken(): Promise<string | null> {
  try {
    const messaging = await import('@react-native-firebase/messaging');
    return await messaging.getToken(messaging.getMessaging());
  } catch {
    return null;
  }
}

export async function deleteFcmToken(): Promise<void> {
  try {
    const messaging = await import('@react-native-firebase/messaging');
    await messaging.deleteToken(messaging.getMessaging());
  } catch {
    // nothing to delete
  }
}
