import { API_URL } from '../../config/env';
import { freshAccessToken } from './http';

/**
 * The live connection to the server. It only ever carries a nudge ("something new in this chat"), never message
 * text: on a nudge the app asks the normal API for the new messages. If the connection is down (no network, server
 * restarting) the screens fall back to asking every few seconds, so chat keeps working either way.
 */

type Nudge = (conversationId: string) => void;
type TypingEvent = (conversationId: string, name: string) => void;

const listeners = new Set<Nudge>();
const typingListeners = new Set<TypingEvent>();
let lastTypingSent = 0;
let socket: WebSocket | null = null;
let wanted = false;
let live = false;
let attempts = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

const wsUrl = () => `${API_URL.replace(/^http/, 'ws')}/v1/ws`;

function schedule(delayMs?: number) {
  if (!wanted || timer) {
    return;
  }
  // 1 s, 2 s, 4 s ... up to 30 s, with a little randomness so a restarted server is not hit by everyone at once.
  const wait = delayMs ?? Math.min(30_000, 1000 * 2 ** attempts) * (0.75 + Math.random() * 0.5);
  attempts += 1;
  timer = setTimeout(() => {
    timer = null;
    void connect();
  }, wait);
}

async function connect(): Promise<void> {
  if (!wanted || socket) {
    return;
  }
  const token = await freshAccessToken().catch(() => null);
  if (!wanted || socket) {
    return;
  }
  if (!token) {
    schedule(15_000); // signed out or offline: look again later
    return;
  }
  let ws: WebSocket;
  try {
    ws = new WebSocket(wsUrl());
  } catch {
    schedule();
    return;
  }
  socket = ws;
  ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }));
  ws.onmessage = ev => {
    try {
      const msg = JSON.parse(String(ev.data)) as { type?: string; conversationId?: string; name?: string };
      if (msg.type === 'ready') {
        live = true;
        attempts = 0;
      } else if (msg.type === 'chat' && typeof msg.conversationId === 'string') {
        const id = msg.conversationId;
        listeners.forEach(cb => cb(id));
      } else if (msg.type === 'typing' && typeof msg.conversationId === 'string') {
        const id = msg.conversationId;
        const who = typeof msg.name === 'string' ? msg.name : '';
        typingListeners.forEach(cb => cb(id, who));
      }
    } catch {
      // ignore anything that is not ours
    }
  };
  ws.onerror = () => undefined; // onclose follows
  ws.onclose = ev => {
    if (socket === ws) {
      socket = null;
    }
    live = false;
    // 4403: not an approved member (yet). Do not hammer the server.
    schedule(ev.code === 4403 ? 60_000 : undefined);
  };
}

export function startRealtime(): void {
  if (wanted) {
    return;
  }
  wanted = true;
  attempts = 0;
  void connect();
}

export function stopRealtime(): void {
  wanted = false;
  live = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const s = socket;
  socket = null;
  if (s) {
    s.onclose = null;
    s.close();
  }
}

export const isRealtimeLive = () => live;

/** "I am typing in this chat". Sent at most every 1.5 seconds, and only while the live connection is up. */
export function sendTypingEvent(conversationId: string): void {
  const now = Date.now();
  if (!live || !socket || now - lastTypingSent < 1500) {
    return;
  }
  lastTypingSent = now;
  try {
    socket.send(JSON.stringify({ type: 'typing', conversationId }));
  } catch {
    // the connection is going away; nobody needs to know I was typing
  }
}

export function onTypingEvent(cb: TypingEvent): () => void {
  typingListeners.add(cb);
  return () => {
    typingListeners.delete(cb);
  };
}

export function onChatNudge(cb: Nudge): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
