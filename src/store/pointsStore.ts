import { create } from 'zustand';

import { backend } from '../services';
import type { PointsSummary, Unsubscribe } from '../types/domain';

interface PointsState {
  summary: PointsSummary | null;
  start: () => void;
  stop: () => void;
}

let off: Unsubscribe | undefined;

/** My points, level and badges (the Profile numbers and the Points screen read this). */
export const usePoints = create<PointsState>()((set, get) => ({
  summary: null,
  start: () => {
    get().stop();
    off = backend.points.subscribeMe(summary => set({ summary }));
  },
  stop: () => {
    off?.();
    off = undefined;
    set({ summary: null });
  },
}));
