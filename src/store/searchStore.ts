import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SearchState {
  recents: string[];
  remember: (query: string) => void;
  forget: (query: string) => void;
  clear: () => void;
}

const MAX_RECENTS = 6;

export const useSearchStore = create<SearchState>()(
  persist(
    set => ({
      recents: [],
      remember: query => {
        const q = query.trim();
        if (q.length < 2) {
          return;
        }
        set(s => ({
          recents: [q, ...s.recents.filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENTS),
        }));
      },
      forget: query => set(s => ({ recents: s.recents.filter(r => r !== query) })),
      clear: () => set({ recents: [] }),
    }),
    { name: 'campushub.search', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
