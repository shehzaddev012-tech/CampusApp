import { AppState } from 'react-native';

import type { Unsubscribe } from '../../types/domain';

/**
 * A piece of server data that screens can watch.
 *
 * It fetches once when the first screen starts watching, then every `intervalMs` while the app is
 * open, and sends the result to every watcher. After the app makes a change it calls `refresh()`
 * so the screen updates immediately. When nobody is watching (or the app is in the background)
 * it stops, so it costs nothing.
 */
export class Topic<T> {
  private readonly listeners = new Set<(value: T) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<void> | null = null;
  private appStateSub: { remove: () => void } | null = null;
  private generation = 0;
  last: T | undefined;

  constructor(
    private readonly fetcher: () => Promise<T>,
    private readonly intervalMs: number,
  ) {}

  subscribe(cb: (value: T) => void): Unsubscribe {
    this.listeners.add(cb);
    if (this.last !== undefined) {
      cb(this.last);
    }
    if (this.listeners.size === 1) {
      this.start();
    } else if (this.last === undefined) {
      void this.refresh();
    }
    return () => {
      this.listeners.delete(cb);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  /** Fetches now and tells every watcher. Concurrent calls share one request. */
  refresh(): Promise<void> {
    if (this.inFlight) {
      return this.inFlight;
    }
    const gen = this.generation;
    this.inFlight = (async () => {
      try {
        const value = await this.fetcher();
        if (gen !== this.generation) {
          return; // the data was reset (sign-out) while the request was running
        }
        this.last = value;
        this.listeners.forEach(cb => cb(value));
      } catch {
        // Keep showing the last good data. The next tick tries again.
      } finally {
        this.inFlight = null;
      }
    })();
    return this.inFlight;
  }

  /** Forget everything (used on sign-in / sign-out so one person never sees another's data). */
  reset(): void {
    this.generation += 1;
    this.last = undefined;
    this.inFlight = null;
    if (this.listeners.size > 0) {
      void this.refresh();
    }
  }

  private start() {
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), this.intervalMs);
    this.appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void this.refresh();
        if (!this.timer) {
          this.timer = setInterval(() => void this.refresh(), this.intervalMs);
        }
      } else if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    });
  }

  private stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.appStateSub?.remove();
    this.appStateSub = null;
  }
}

/** Topics that exist once per id (for example the comments of one post). */
export class TopicMap<T> {
  private readonly map = new Map<string, Topic<T>>();

  constructor(
    private readonly make: (key: string) => Topic<T>,
  ) {}

  get(key: string): Topic<T> {
    let t = this.map.get(key);
    if (!t) {
      t = this.make(key);
      this.map.set(key, t);
    }
    return t;
  }

  resetAll() {
    this.map.forEach(t => t.reset());
    this.map.clear();
  }
}
