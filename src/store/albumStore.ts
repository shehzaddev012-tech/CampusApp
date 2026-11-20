import { create } from 'zustand';

import { backend } from '../services';
import type { Album, AlbumView, Photo, PickedPhoto, Unsubscribe } from '../types/domain';
import { useToast } from './toastStore';

/** The list of albums (Photos tab). */
interface AlbumListState {
  albums: Album[];
  status: 'idle' | 'loading' | 'ready';
  start: () => void;
  stop: () => void;
}

let offList: Unsubscribe | undefined;

export const useAlbums = create<AlbumListState>()((set, get) => ({
  albums: [],
  status: 'idle',
  start: () => {
    get().stop();
    set({ status: 'loading' });
    offList = backend.albums.subscribeList(albums => set({ albums, status: 'ready' }));
  },
  stop: () => {
    offList?.();
    offList = undefined;
    set({ albums: [], status: 'idle' });
  },
}));

/**
 * The album that is open: its pictures, who liked what, and the actions on them.
 * The album screen and the full-screen viewer both read this, so they always agree.
 */
interface AlbumViewState {
  view: AlbumView | null;
  loading: boolean;
  loadingMore: boolean;
  uploading: boolean;
  error: string | null;

  open: (albumId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  close: () => void;
  upload: (files: PickedPhoto[]) => Promise<boolean>;
  toggleLike: (photo: Photo) => Promise<void>;
  deletePhoto: (photoId: string) => Promise<boolean>;
}

const fail = (title: string, e: unknown) => useToast.getState().show({ title, body: e instanceof Error ? e.message : 'Please try again.', tone: 'alert' });

export const useAlbumView = create<AlbumViewState>()((set, get) => ({
  view: null,
  loading: false,
  loadingMore: false,
  uploading: false,
  error: null,

  open: async albumId => {
    set({ loading: true, error: null, view: get().view?.album.id === albumId ? get().view : null });
    try {
      set({ view: await backend.albums.open(albumId), loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Could not open this album.' });
    }
  },

  loadMore: async () => {
    const { view, loadingMore } = get();
    if (!view || view.nextBefore === null || loadingMore) {
      return;
    }
    set({ loadingMore: true });
    try {
      const more = await backend.albums.open(view.album.id, view.nextBefore);
      const current = get().view;
      if (current && current.album.id === view.album.id) {
        set({ view: { ...current, photos: [...current.photos, ...more.photos], nextBefore: more.nextBefore } });
      }
    } catch (e) {
      fail('Could not load more photos', e);
    } finally {
      set({ loadingMore: false });
    }
  },

  close: () => set({ view: null, error: null }),

  upload: async files => {
    const view = get().view;
    if (!view || files.length === 0) {
      return false;
    }
    set({ uploading: true });
    try {
      // The server accepts up to 10 pictures per request.
      for (let i = 0; i < files.length; i += 10) {
        await backend.albums.upload(view.album.id, files.slice(i, i + 10));
      }
      await get().open(view.album.id);
      return true;
    } catch (e) {
      fail('Could not upload', e);
      return false;
    } finally {
      set({ uploading: false });
    }
  },

  toggleLike: async photo => {
    const view = get().view;
    if (!view) {
      return;
    }
    const liked = !photo.liked;
    const patch = (p: Photo, l: boolean, n: number) => (p.id === photo.id ? { ...p, liked: l, likeCount: n } : p);
    // Show the heart straight away; the server's answer settles the real count.
    set({ view: { ...view, photos: view.photos.map(p => patch(p, liked, Math.max(0, p.likeCount + (liked ? 1 : -1)))) } });
    try {
      const r = await backend.albums.setLike(photo.id, liked);
      const now = get().view;
      if (now) {
        set({ view: { ...now, photos: now.photos.map(p => patch(p, r.liked, r.likeCount)) } });
      }
    } catch (e) {
      const now = get().view;
      if (now) {
        set({ view: { ...now, photos: now.photos.map(p => patch(p, photo.liked, photo.likeCount)) } });
      }
      fail('Could not save your like', e);
    }
  },

  deletePhoto: async photoId => {
    try {
      await backend.albums.deletePhoto(photoId);
      const view = get().view;
      if (view) {
        const photos = view.photos.filter(p => p.id !== photoId);
        set({
          view: {
            ...view,
            photos,
            bestPhotoId: view.bestPhotoId === photoId ? null : view.bestPhotoId,
            album: { ...view.album, photoCount: Math.max(0, view.album.photoCount - 1) },
          },
        });
      }
      return true;
    } catch (e) {
      fail('Could not delete the photo', e);
      return false;
    }
  },
}));
