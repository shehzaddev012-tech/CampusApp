import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AppState {
  hasSeenOnboarding: boolean;
  markOnboardingSeen: () => void;
}

/** Small persisted app-level flags. */
export const useAppStore = create<AppState>()(
  persist(
    set => ({
      hasSeenOnboarding: false,
      markOnboardingSeen: () => set({ hasSeenOnboarding: true }),
    }),
    {
      name: 'campushub.app',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** True once the persisted app flags have been loaded from disk. */
export function useAppHydrated(): boolean {
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAppStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
