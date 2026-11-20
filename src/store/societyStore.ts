import { create } from 'zustand';

import { backend } from '../services';
import type { Society, Unsubscribe } from '../types/domain';
import { confirm } from '../utils/confirm';
import { useToast } from './toastStore';

interface SocietyState {
  societies: Society[];
  status: 'idle' | 'loading' | 'ready';

  start: () => void;
  stop: () => void;
  /** Join or leave. Returns true when it worked. */
  toggleJoin: (society: Society) => Promise<boolean>;
}

let off: Unsubscribe | undefined;

export const useSocieties = create<SocietyState>()((set, get) => ({
  societies: [],
  status: 'idle',

  start: () => {
    get().stop();
    set({ status: 'loading' });
    off = backend.societies.subscribeList(societies => set({ societies, status: 'ready' }));
  },

  stop: () => {
    off?.();
    off = undefined;
    set({ societies: [], status: 'idle' });
  },

  toggleJoin: async society => {
    if (society.joined && !(await confirm({ title: `Leave ${society.name}?`, message: 'You will stop seeing its members-only updates. You can join again any time.', confirmLabel: 'Leave' }))) {
      return false;
    }
    try {
      await (society.joined ? backend.societies.leave(society.id) : backend.societies.join(society.id));
      return true;
    } catch (e) {
      useToast.getState().show({ title: society.joined ? 'Could not leave' : 'Could not join', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
      return false;
    }
  },
}));

/** Societies the person can speak for: the ones they head (admins: every society). */
export function manageableSocieties(societies: Society[], isAdmin: boolean): Society[] {
  return isAdmin ? societies : societies.filter(s => s.myRole === 'head');
}
