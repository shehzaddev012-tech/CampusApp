import { Alert } from 'react-native';

import { backend } from '../services';
import { useToast } from '../store/toastStore';
import type { ReportReason, ReportTarget } from '../types/domain';

/**
 * "Report this": asks for a reason, sends it to the university's admins, and says thanks.
 * (A person can report the same item only once; asking again is harmless.)
 */
export function reportContent(targetType: ReportTarget, targetId: string, what: string): void {
  const send = async (reason: ReportReason) => {
    const { show } = useToast.getState();
    try {
      await backend.reports.report({ targetType, targetId, reason });
      show({ title: 'Report sent', body: 'The university admins will take a look. Thank you.', tone: 'success' });
    } catch (e) {
      show({ title: 'Could not send the report', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  };
  Alert.alert(`Report this ${what}?`, 'Why are you reporting it?', [
    { text: 'Spam', onPress: () => send('spam') },
    { text: 'Inappropriate', onPress: () => send('inappropriate') },
    { text: 'Scam or fake', onPress: () => send('scam') },
  ]);
}

export const rs = (n: number): string => (n === 0 ? 'Free' : `Rs ${n.toLocaleString('en-US')}`);
