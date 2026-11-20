import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Text on the main button. Default "Yes". */
  confirmLabel?: string;
  /** Text on the other button. Default "Cancel". */
  cancelLabel?: string;
  /** danger = red, for things that cannot be undone. Default danger. */
  tone?: 'danger' | 'neutral';
}

interface ConfirmState {
  request: ConfirmOptions | null;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  answer: (value: boolean) => void;
}

let resolver: ((value: boolean) => void) | null = null;

/** One "Are you sure?" popup at a time, shown by <ConfirmHost/>. */
export const useConfirm = create<ConfirmState>()(set => ({
  request: null,
  ask: options =>
    new Promise<boolean>(resolve => {
      // A new question replaces an unanswered one (which counts as "no").
      resolver?.(false);
      resolver = resolve;
      set({ request: options });
    }),
  answer: value => {
    const done = resolver;
    resolver = null;
    set({ request: null });
    done?.(value);
  },
}));
