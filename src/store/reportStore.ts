import { create } from 'zustand';

interface ReportState {
  /** What is being reported ("story", "listing"...) or null when no popup is open. */
  what: string | null;
  onPick: ((reason: 'spam' | 'inappropriate' | 'scam') => void) | null;
  open: (what: string, onPick: (reason: 'spam' | 'inappropriate' | 'scam') => void) => void;
  close: () => void;
}

/** The "Report this ...?" popup state, shown by <ReportHost/>. */
export const useReportDialog = create<ReportState>()(set => ({
  what: null,
  onPick: null,
  open: (what, onPick) => set({ what, onPick }),
  close: () => set({ what: null, onPick: null }),
}));
