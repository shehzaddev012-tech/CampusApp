import type { CampusEvent } from '../types/domain';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export const dayNumber = (ms: number) => String(new Date(ms).getDate()).padStart(2, '0');
export const monthShort = (ms: number) => MONTHS[new Date(ms).getMonth()];
export const weekdayShort = (ms: number) => WEEKDAYS[new Date(ms).getDay()];

/** "10:00 AM" */
export function timeLabel(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Tue, 24 Nov" */
export function dateLabel(ms: number): string {
  const d = new Date(ms);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()][0]}${MONTHS[d.getMonth()].slice(1).toLowerCase()}`;
}

/** Key that groups events by calendar day. */
export const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export type EventPhase = 'upcoming' | 'live' | 'ended';

export function eventPhase(e: Pick<CampusEvent, 'startsAt' | 'endsAt'>, now = Date.now()): EventPhase {
  if (now < e.startsAt) {
    return 'upcoming';
  }
  return now <= e.endsAt ? 'live' : 'ended';
}

/** "Starts in 2 days", "Starts in 3 h", "Live now", "Ended". */
export function startsInLabel(e: Pick<CampusEvent, 'startsAt' | 'endsAt'>, now = Date.now()): string {
  const phase = eventPhase(e, now);
  if (phase === 'live') {
    return 'Live now';
  }
  if (phase === 'ended') {
    return 'Ended';
  }
  const diff = e.startsAt - now;
  if (diff < HOUR) {
    return `Starts in ${Math.max(1, Math.round(diff / 60_000))} min`;
  }
  if (diff < DAY) {
    return `Starts in ${Math.round(diff / HOUR)} h`;
  }
  const days = Math.round(diff / DAY);
  return days === 1 ? 'Tomorrow' : `Starts in ${days} days`;
}

/** Google Calendar "add event" link (no permission or native module needed). */
export function calendarUrl(e: CampusEvent): string {
  const fmt = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const q = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(e.title)}`,
    `dates=${fmt(e.startsAt)}/${fmt(e.endsAt)}`,
    `location=${encodeURIComponent(e.venue)}`,
    `details=${encodeURIComponent(`${e.blurb}\n\nOrganised by ${e.organizer}. Added from IAC Campus.`)}`,
  ].join('&');
  return `https://calendar.google.com/calendar/render?${q}`;
}
