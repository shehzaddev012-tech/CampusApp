/**
 * QR payloads.
 *
 *   student ticket   CH1|T|{uniId}|{eventId}|{uid}|{code}
 *   guest pass       CH1|G|{uniId}|{eventId}|{passId}|{code}
 *
 * `code` is a long random secret stored with the ticket. A scan is valid only if the code
 * matches the one in the database, so a screenshot of someone else's QR is useless unless it is
 * the real one, and a made-up QR can never match. Once used, the ticket cannot be used again.
 */

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function makeCode(length = 24): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export type ParsedPayload =
  | { kind: 'ticket'; universityId: string; eventId: string; ownerId: string; code: string }
  | { kind: 'guest'; universityId: string; eventId: string; ownerId: string; code: string };

export function encodeTicket(universityId: string, eventId: string, uid: string, code: string): string {
  return `CH1|T|${universityId}|${eventId}|${uid}|${code}`;
}

export function encodeGuestPass(universityId: string, eventId: string, passId: string, code: string): string {
  return `CH1|G|${universityId}|${eventId}|${passId}|${code}`;
}

/** A student card QR: CH1|C|{uniId}|{uid}|{window}|{signature}. It rotates every 30 seconds. */
export const isCardPayload = (raw: string) => raw.trim().startsWith('CH1|C|') && raw.trim().split('|').length === 6;

export function parsePayload(raw: string): ParsedPayload | null {
  const parts = raw.trim().split('|');
  if (parts.length !== 6 || parts[0] !== 'CH1' || (parts[1] !== 'T' && parts[1] !== 'G')) {
    return null;
  }
  const [, type, universityId, eventId, ownerId, code] = parts;
  if (!universityId || !eventId || !ownerId || code.length < 12) {
    return null;
  }
  return { kind: type === 'T' ? 'ticket' : 'guest', universityId, eventId, ownerId, code };
}

/** Short human-readable code for manual entry when a camera is not available. */
export function shortCode(code: string): string {
  return code.slice(0, 4).toUpperCase() + '-' + code.slice(4, 8).toUpperCase();
}
