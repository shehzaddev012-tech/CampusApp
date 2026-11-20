import { create } from 'zustand';

import { backend } from '../services';
import type { AppNotification, PushPermission, Unsubscribe } from '../types/domain';
import { useToast } from './toastStore';

interface NotificationState {
  /** The inbox. It lives on the server, so it is the same on every phone and survives reinstalling. */
  items: AppNotification[];
  unread: number;
  permission: PushPermission;

  start: () => void;
  stop: () => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  refreshPermission: () => Promise<void>;
  /** Shows the system prompt, then registers the device if the student agreed. */
  enable: () => Promise<boolean>;
}

let off: Unsubscribe | undefined;
/** Notifications already seen, so only genuinely new ones raise a banner. */
let known: Set<string> | null = null;

export const useNotifications = create<NotificationState>()((set, get) => ({
  items: [],
  unread: 0,
  permission: 'undetermined',

  start: () => {
    get().stop();
    known = null;
    off = backend.notifications.subscribe(({ notifications, unread }) => {
      if (known === null) {
        known = new Set(notifications.map(n => n.id));
      } else {
        for (const n of notifications) {
          if (!known.has(n.id)) {
            known.add(n.id);
            if (!n.read) {
              useToast.getState().show({
                title: n.title,
                body: n.body,
                tone: n.kind === 'alert' ? 'alert' : 'info',
                postId: n.postId,
                eventId: n.eventId,
              });
            }
          }
        }
      }
      set({ items: notifications, unread });
    });
  },

  stop: () => {
    off?.();
    off = undefined;
    known = null;
    set({ items: [], unread: 0 });
  },

  markAllRead: () => {
    set(s => ({ items: s.items.map(i => ({ ...i, read: true })), unread: 0 }));
    backend.notifications.markAllRead().catch(() => undefined);
  },

  markRead: id => {
    set(s => {
      const target = s.items.find(i => i.id === id);
      return {
        items: s.items.map(i => (i.id === id ? { ...i, read: true } : i)),
        unread: target && !target.read ? Math.max(0, s.unread - 1) : s.unread,
      };
    });
    backend.notifications.markRead(id).catch(() => undefined);
  },

  refreshPermission: async () => {
    set({ permission: await backend.push.getPermission() });
  },

  enable: async () => {
    const granted = await backend.push.requestPermission();
    await get().refreshPermission();
    if (granted) {
      await backend.push.registerDevice().catch(() => undefined);
    }
    return granted;
  },
}));

export const selectUnreadCount = (s: NotificationState) => s.unread;
