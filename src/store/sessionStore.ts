import { create } from 'zustand';

import { backend } from '../services';
import type { AuthUser, Me, Membership, University, Unsubscribe } from '../types/domain';

/**
 * The session state machine decides which part of the app is shown:
 *
 *   booting ──► signedOut ──► needsUniversity ──► pending ──► active
 *                                     ▲              │
 *                                     └── rejected ◄─┘
 */
export type SessionStatus =
  | 'booting'
  | 'signedOut'
  | 'needsUniversity'
  | 'pending'
  | 'rejected'
  | 'active';

interface JoinInput {
  university: University;
  studentId: string;
  department: string;
  batch: string;
}

interface SessionState {
  status: SessionStatus;
  user: AuthUser | null;
  university: University | null;
  membership: Membership | null;
  /** True while a sign-in / submit request is in flight. */
  busy: boolean;
  error: string | null;

  bootstrap: () => void;
  signIn: () => Promise<void>;
  signInDev: (email: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  submitJoinRequest: (input: JoinInput) => Promise<boolean>;
  leaveUniversity: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

let started = false;
let unsubAuth: Unsubscribe | undefined;
let unsubMe: Unsubscribe | undefined;

function messageOf(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'Something went wrong. Please try again.';
}

export const useSession = create<SessionState>()((set, get) => {
  const stopMe = () => {
    unsubMe?.();
    unsubMe = undefined;
  };

  const applyMe = ({ membership, university }: Me) => {
    if (!membership) {
      set({ membership: null, university: null, status: 'needsUniversity' });
      return;
    }
    const status: SessionStatus =
      membership.status === 'active' ? 'active' : membership.status === 'pending' ? 'pending' : 'rejected';
    set({ membership, university, status });
  };

  const run = async (fn: () => Promise<unknown>, ignoreCancel = false) => {
    set({ busy: true, error: null });
    try {
      await fn();
    } catch (e) {
      const msg = messageOf(e);
      // The person closing the Google dialog is not an error worth showing.
      if (!(ignoreCancel && /cancel/i.test(msg))) {
        set({ error: msg });
      }
    } finally {
      set({ busy: false });
    }
  };

  return {
    status: 'booting',
    user: null,
    university: null,
    membership: null,
    busy: false,
    error: null,

    bootstrap: () => {
      if (started) {
        return;
      }
      started = true;
      unsubAuth = backend.auth.onAuthStateChanged(user => {
        stopMe();
        if (!user) {
          set({ status: 'signedOut', user: null, university: null, membership: null });
          return;
        }
        set({ user, status: 'booting' });
        unsubMe = backend.membership.subscribeMe(applyMe);
      });
    },

    signIn: () => run(() => backend.auth.signInWithGoogle(), true),
    signInDev: (email, name) => run(() => backend.auth.signInDev(email, name)),

    signOut: async () => {
      stopMe();
      await backend.auth.signOut();
    },

    submitJoinRequest: async input => {
      let ok = false;
      await run(async () => {
        await backend.membership.submitJoinRequest(input);
        ok = true;
      });
      return ok;
    },

    leaveUniversity: async () => {
      await backend.membership.leaveUniversity();
      set({ university: null, membership: null, status: 'needsUniversity' });
    },

    deleteAccount: async () => {
      stopMe();
      await backend.membership.deleteAccount();
    },

    clearError: () => set({ error: null }),
  };
});

/** For tests / hot reload. */
export function _teardownSession() {
  unsubAuth?.();
  unsubMe?.();
  started = false;
}
