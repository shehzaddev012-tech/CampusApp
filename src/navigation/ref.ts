import { createNavigationContainerRef } from '@react-navigation/native';

import type { AppStackParamList } from './types';

/** Lets code outside screens (toasts, push handlers) navigate. */
export const navigationRef = createNavigationContainerRef<AppStackParamList>();

export function openPost(postId: string) {
  if (navigationRef.isReady() && navigationRef.getRootState()?.routeNames?.includes('PostDetail')) {
    navigationRef.navigate('PostDetail', { postId });
  }
}

export function openEvent(eventId: string) {
  if (navigationRef.isReady() && navigationRef.getRootState()?.routeNames?.includes('EventDetail')) {
    navigationRef.navigate('EventDetail', { eventId });
  }
}
