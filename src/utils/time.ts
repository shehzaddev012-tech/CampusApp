const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "Just now", "20m ago", "2h ago", "Yesterday", "3d ago", then a short date. */
export function timeAgo(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  if (diff < MIN) {
    return 'Just now';
  }
  if (diff < HOUR) {
    return `${Math.floor(diff / MIN)}m ago`;
  }
  if (diff < DAY) {
    return `${Math.floor(diff / HOUR)}h ago`;
  }
  if (diff < 2 * DAY) {
    return 'Yesterday';
  }
  if (diff < 7 * DAY) {
    return `${Math.floor(diff / DAY)}d ago`;
  }
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** 1200 -> "1.2k" */
export function compactNumber(n: number): string {
  if (n >= 10_000) {
    return `${Math.round(n / 1000)}k`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(n);
}
