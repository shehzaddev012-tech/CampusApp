import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AppStackParamList } from '../../navigation/types';
import { useEvents } from '../../store/eventStore';
import { useToast } from '../../store/toastStore';
import type { CampusEvent, EventRsvp } from '../../types/domain';
import { seatsLeft } from '../../types/domain';
import { eventPhase } from '../../utils/eventTime';

export type RsvpLabel = 'Get ticket' | 'View ticket' | 'Join waitlist' | 'On waitlist' | 'See recap';

export interface RsvpState {
  rsvp: EventRsvp | undefined;
  label: RsvpLabel;
  full: boolean;
  /** Does the primary action need a network call? */
  act: () => Promise<void>;
  open: () => void;
}

/** What the primary button on an event card should say and do. */
export function useRsvpState(event: CampusEvent): RsvpState {
  const nav = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const rsvp = useEvents(s => s.rsvps[event.id]);
  const take = useEvents(s => s.rsvp);
  const show = useToast(s => s.show);

  const ended = eventPhase(event) === 'ended';
  const full = seatsLeft(event) === 0;

  let label: RsvpLabel = 'Get ticket';
  if (ended) {
    label = 'See recap';
  } else if (rsvp?.status === 'going') {
    label = 'View ticket';
  } else if (rsvp?.status === 'waitlist') {
    label = 'On waitlist';
  } else if (full) {
    label = 'Join waitlist';
  }

  const open = () => nav.navigate('EventDetail', { eventId: event.id });

  const act = async () => {
    if (ended || rsvp?.status === 'waitlist') {
      open();
      return;
    }
    if (rsvp?.status === 'going') {
      nav.navigate('Ticket', { eventId: event.id });
      return;
    }
    const result = await take(event.id, 'going');
    if (result?.status === 'going') {
      nav.navigate('Ticket', { eventId: event.id });
    } else if (result?.status === 'waitlist') {
      show({
        title: "You're on the waiting list",
        body: 'We will notify you if a seat opens up.',
        tone: 'info',
      });
    }
  };

  return { rsvp, label, full, act, open };
}
