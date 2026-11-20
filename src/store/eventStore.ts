import { create } from 'zustand';

import { backend } from '../services';
import type {
  CampusEvent,
  CheckInResult,
  EventRsvp,
  GuestPass,
  NewEventInput,
  Role,
  Unsubscribe,
} from '../types/domain';
import { canCreateEvents } from '../types/domain';
import { useToast } from './toastStore';

interface EventState {
  events: CampusEvent[];
  status: 'idle' | 'loading' | 'ready';
  /** My RSVP / ticket for each event, keyed by event id. */
  rsvps: Record<string, EventRsvp>;
  /** Guest passes I created. */
  passes: GuestPass[];
  /** Passes waiting for a decision (staff only). */
  pending: GuestPass[];

  start: (role: Role) => void;
  stop: () => void;

  rsvp: (eventId: string, status: 'going' | 'interested') => Promise<EventRsvp | null>;
  cancel: (eventId: string) => Promise<void>;
  toggleVolunteer: (eventId: string) => Promise<void>;
  sendFeedback: (eventId: string, rating: number, comment: string) => Promise<boolean>;
  createEvent: (input: NewEventInput) => Promise<string | null>;
  createPass: (event: CampusEvent, guestName: string, guestPhone: string) => Promise<boolean>;
  decidePass: (passId: string, approve: boolean) => Promise<void>;
  checkIn: (payload: string, eventId?: string) => Promise<CheckInResult>;
}

let offs: Unsubscribe[] = [];

function fail(title: string, e: unknown) {
  const body = e instanceof Error ? e.message : 'Please try again.';
  useToast.getState().show({ title, body, tone: 'alert' });
}

export const useEvents = create<EventState>()((set, get) => ({
  events: [],
  status: 'idle',
  rsvps: {},
  passes: [],
  pending: [],

  start: role => {
    get().stop();
    set({ status: 'loading' });
    offs = [
      backend.events.subscribeEvents(({ events, rsvps }) => set({ events, rsvps, status: 'ready' })),
      backend.events.subscribeMyPasses(passes => set({ passes })),
    ];
    if (canCreateEvents(role) || role === 'security') {
      offs.push(backend.events.subscribePendingPasses(pending => set({ pending })));
    }
  },

  stop: () => {
    offs.forEach(off => off());
    offs = [];
    set({ events: [], status: 'idle', rsvps: {}, passes: [], pending: [] });
  },

  rsvp: async (eventId, status) => {
    try {
      return await backend.events.rsvp(eventId, status);
    } catch (e) {
      fail('Could not update your RSVP', e);
      return null;
    }
  },

  cancel: async eventId => {
    try {
      await backend.events.cancelRsvp(eventId);
    } catch (e) {
      fail('Could not cancel', e);
    }
  },

  toggleVolunteer: async eventId => {
    const on = !!get().rsvps[eventId]?.volunteer;
    try {
      await backend.events.setVolunteer(eventId, !on);
    } catch (e) {
      fail('Could not update volunteering', e);
    }
  },

  sendFeedback: async (eventId, rating, comment) => {
    try {
      await backend.events.submitFeedback(eventId, rating, comment.trim());
      return true;
    } catch (e) {
      fail('Could not send feedback', e);
      return false;
    }
  },

  createEvent: async input => {
    try {
      return await backend.events.createEvent(input);
    } catch (e) {
      fail('Could not create the event', e);
      return null;
    }
  },

  createPass: async (event, guestName, guestPhone) => {
    try {
      await backend.events.createGuestPass(event.id, guestName.trim(), guestPhone.trim());
      return true;
    } catch (e) {
      fail('Could not create the pass', e);
      return false;
    }
  },

  decidePass: async (passId, approve) => {
    try {
      await backend.events.decideGuestPass(passId, approve);
    } catch (e) {
      fail('Could not save the decision', e);
    }
  },

  checkIn: async (payload, eventId) => {
    try {
      return await backend.events.checkIn(payload, eventId);
    } catch (e) {
      return {
        ok: false,
        reason: 'invalid',
        detail: e instanceof Error && e.message ? e.message : 'Could not check this ticket. Check your connection.',
      };
    }
  },
}));

/** Events that have not ended yet, soonest first. */
export function upcomingEvents(events: CampusEvent[], now = Date.now()): CampusEvent[] {
  return events.filter(e => e.endsAt >= now).sort((a, b) => a.startsAt - b.startsAt);
}

/** The event to feature: one that is live right now, otherwise the next one. */
export function featuredEvent(events: CampusEvent[], now = Date.now()): CampusEvent | undefined {
  const live = events.find(e => e.startsAt <= now && e.endsAt >= now);
  return live ?? upcomingEvents(events, now)[0];
}
