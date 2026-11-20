import { useEffect } from 'react';

import { backend } from '../services';
import { useEvents } from '../store/eventStore';
import { useFeed } from '../store/feedStore';
import { useAlbums } from '../store/albumStore';
import { usePoints } from '../store/pointsStore';
import { useNotifications } from '../store/notificationStore';
import { useSocieties } from '../store/societyStore';
import { useSession } from '../store/sessionStore';

/**
 * Runs while a student is signed in and approved:
 *  - keeps the feed, events and notification inbox up to date,
 *  - registers the phone for push when permission was granted (needs Firebase; otherwise a no-op).
 */
export function useSessionServices() {
  const uid = useSession(s => s.membership?.uid);
  const role = useSession(s => s.membership?.role);

  useEffect(() => {
    if (!uid || !role) {
      return undefined;
    }
    useFeed.getState().start();
    useEvents.getState().start(role);
    useNotifications.getState().start();
    useSocieties.getState().start();
    useAlbums.getState().start();
    usePoints.getState().start();

    useNotifications
      .getState()
      .refreshPermission()
      .then(() => {
        if (useNotifications.getState().permission === 'granted') {
          backend.push.registerDevice().catch(() => undefined);
        }
      });

    return () => {
      useFeed.getState().stop();
      useEvents.getState().stop();
      useNotifications.getState().stop();
      useSocieties.getState().stop();
      useAlbums.getState().stop();
      usePoints.getState().stop();
    };
  }, [uid, role]);
}
