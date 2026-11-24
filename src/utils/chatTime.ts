const DAY = 86_400_000;

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** The label of a day separator in a chat: Today, Yesterday, a weekday this week, or the date. */
export function dayLabel(ms: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / DAY);
  if (days <= 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return new Date(ms).toLocaleDateString('en-GB', { weekday: 'long' });
  }
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** The time on a row of the chat list: 17:42, Yesterday, Monday, or 12/11/26. */
export function listTime(ms: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / DAY);
  if (days <= 0) {
    return clock(ms);
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return new Date(ms).toLocaleDateString('en-GB', { weekday: 'long' });
  }
  return new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export const sameDay =(a: number, b: number) => startOfDay(a) === startOfDay(b);

/** "last seen today at 17:42", "last seen yesterday at 09:10", "last seen 12 Nov at 18:00". */
export function lastSeenText(ms: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / DAY);
  if (days <= 0) {
    return `last seen today at ${clock(ms)}`;
  }
  if (days === 1) {
    return `last seen yesterday at ${clock(ms)}`;
  }
  return `last seen ${new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at ${clock(ms)}`;
}
