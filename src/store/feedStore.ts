import { create } from 'zustand';

import { backend } from '../services';
import { useToast } from './toastStore';
import type { NewPostInput, Post, PostComment, Unsubscribe, UserPostState } from '../types/domain';

interface FeedState {
  posts: Post[];
  status: 'idle' | 'loading' | 'ready';
  userState: UserPostState;

  start: () => void;
  stop: () => void;
  create: (input: NewPostInput) => Promise<string | null>;
  toggleLike: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<boolean>;
  markRead: (postId: string) => void;
}

let offFeed: Unsubscribe | undefined;

const empty: UserPostState = { liked: {}, bookmarked: {} };

const URGENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Order: fresh alerts (last 24h), then pinned, then newest first. */
export function sortFeed(posts: Post[], now = Date.now()): Post[] {
  const rank = (p: Post) => (p.kind === 'alert' && now - p.createdAt < URGENT_WINDOW_MS ? 2 : p.pinned ? 1 : 0);
  return [...posts].sort((a, b) => rank(b) - rank(a) || b.createdAt - a.createdAt);
}

const toSet = (ids: string[]): Record<string, true> => Object.fromEntries(ids.map(id => [id, true as const]));

export const useFeed = create<FeedState>()((set, get) => ({
  posts: [],
  status: 'idle',
  userState: empty,

  start: () => {
    get().stop();
    set({ status: 'loading' });
    offFeed = backend.posts.subscribeFeed(feed => {
      set({
        posts: feed.posts,
        status: 'ready',
        userState: { liked: toSet(feed.liked), bookmarked: toSet(feed.bookmarked) },
      });
    });
  },

  stop: () => {
    offFeed?.();
    offFeed = undefined;
    set({ posts: [], status: 'idle', userState: empty });
  },

  create: async input => (await backend.posts.createPost(input)).id,

  toggleLike: async postId => {
    await backend.posts.setLike(postId, !get().userState.liked[postId]);
  },

  toggleBookmark: async postId => {
    const save = !get().userState.bookmarked[postId];
    const { show } = useToast.getState();
    try {
      await backend.posts.setBookmark(postId, save);
      // Tell the student it worked: the little icon alone is easy to miss.
      show(save ? { title: 'Saved', body: 'Find it under Profile > Saved posts.', tone: 'success' } : { title: 'Removed from saved' });
    } catch (e) {
      show({ title: 'Could not update your saved posts', body: e instanceof Error ? e.message : undefined, tone: 'alert' });
    }
  },

  addComment: async (postId, text) => {
    const clean = text.trim();
    if (clean.length === 0) {
      return false;
    }
    await backend.posts.addComment(postId, clean.slice(0, 500));
    return true;
  },

  markRead: postId => {
    backend.posts.markRead(postId).catch(() => undefined);
  },
}));

/** Live comments for one post. Returns the unsubscribe function. */
export function watchComments(postId: string, cb: (comments: PostComment[]) => void): Unsubscribe {
  return backend.posts.subscribeComments(postId, cb);
}
