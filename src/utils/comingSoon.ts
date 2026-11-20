import { Alert } from 'react-native';

/** Placeholder for features that arrive in later modules. */
export function comingSoon(feature: string) {
  Alert.alert(feature, 'This feature arrives in an upcoming module of CampusHub.');
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) {
    return 'Good night';
  }
  if (h < 12) {
    return 'Good morning';
  }
  if (h < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

export function firstName(full: string | undefined | null): string {
  return (full ?? '').trim().split(/\s+/)[0] || 'there';
}
