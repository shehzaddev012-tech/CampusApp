import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'alert';

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
  /** Tapping the toast opens this post. */
  postId?: string;
  /** Or this event. */
  eventId?: string;
}

interface ToastState {
  current: Toast | null;
  show: (t: Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone }) => void;
  hide: () => void;
}

let counter = 0;

/** One in-app banner at a time (foreground pushes, "Published", errors). */
export const useToast = create<ToastState>()(set => ({
  current: null,
  show: t => set({ current: { tone: 'info', ...t, id: ++counter } }),
  hide: () => set({ current: null }),
}));
