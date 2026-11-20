import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PushPermission } from '../../types/domain';

const ASKED_KEY = 'campushub.push.asked';

/** Notification permission only needs a runtime prompt on Android 13 (API 33) and above. */
function needsPrompt(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) >= 33;
}

export async function getNotificationPermission(): Promise<PushPermission> {
  if (!needsPrompt()) {
    return 'granted';
  }
  const ok = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  if (ok) {
    return 'granted';
  }
  const asked = await AsyncStorage.getItem(ASKED_KEY).catch(() => null);
  return asked ? 'denied' : 'undetermined';
}

export async function askNotificationPermission(): Promise<boolean> {
  if (!needsPrompt()) {
    return true;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => undefined);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
