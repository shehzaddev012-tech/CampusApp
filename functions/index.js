const { onDocumentCreated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const crypto = require('crypto');

initializeApp();
const db = getFirestore();

/** Same rule as src/types/domain.ts `slug`. */
const slug = text =>
  String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * When a post is published, push it to the right audience.
 *   channel == null  -> topic  uni_{uniId}                    (whole university)
 *   channel set      -> topic  dept_{uniId}_{department}      (one department)
 * Alerts use high priority so they wake the phone.
 */
exports.onPostCreated = onDocumentCreated('universities/{uniId}/posts/{postId}', async event => {
  const post = event.data && event.data.data();
  if (!post) {
    return;
  }
  const { uniId, postId } = event.params;
  const topic = post.channel ? `dept_${uniId}_${slug(post.channel)}` : `uni_${uniId}`;
  const isAlert = post.kind === 'alert';

  await getMessaging().send({
    topic,
    notification: {
      title: isAlert ? `Alert: ${post.title}` : post.title,
      body: String(post.body || '').slice(0, 140),
    },
    data: { kind: String(post.kind), postId },
    android: { priority: isAlert ? 'high' : 'normal', notification: { channelId: isAlert ? 'alerts' : 'updates' } },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Events (Module 3)
// ─────────────────────────────────────────────────────────────────────────────

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
/** Ticket secret. Cryptographically random, unlike the client's Math.random. */
function newCode(length = 24) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

async function pushToUser(uid, notification, data) {
  const devices = await db.collection('users').doc(uid).collection('devices').get();
  const tokens = devices.docs.map(d => d.id);
  if (tokens.length === 0) {
    return;
  }
  await getMessaging().sendEachForMulticast({ tokens, notification, data, android: { priority: 'high' } });
}

/**
 * When a student gives up a seat, the first student on the waiting list gets it.
 * The client already lowered goingCount; promoting raises it again and lowers waitlistCount.
 */
exports.onRsvpDeleted = onDocumentDeleted('universities/{uniId}/events/{eventId}/rsvps/{uid}', async event => {
  const gone = event.data && event.data.data();
  if (!gone || gone.status !== 'going') {
    return;
  }
  const { uniId, eventId } = event.params;
  const eventRef = db.doc(`universities/${uniId}/events/${eventId}`);

  const next = await db
    .collection(`universities/${uniId}/events/${eventId}/rsvps`)
    .where('status', '==', 'waitlist')
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get();
  if (next.empty) {
    return;
  }
  const winner = next.docs[0];

  const promoted = await db.runTransaction(async tx => {
    const [ev, w] = await Promise.all([tx.get(eventRef), tx.get(winner.ref)]);
    if (!ev.exists || !w.exists || w.data().status !== 'waitlist') {
      return null;
    }
    const e = ev.data();
    if (e.capacity != null && e.goingCount >= e.capacity) {
      return null;
    }
    tx.update(winner.ref, { status: 'going', code: newCode() });
    tx.update(eventRef, { goingCount: FieldValue.increment(1), waitlistCount: FieldValue.increment(-1) });
    return e.title;
  });

  if (promoted) {
    await pushToUser(
      winner.id,
      { title: 'A seat opened up', body: `You now have a ticket for ${promoted}.` },
      { kind: 'official', eventId },
    );
  }
});

/**
 * Reminders: one day before and one hour before an event, sent to everyone who holds a ticket
 * (devices subscribe to the topic event_{eventId} when they take a seat).
 */
exports.eventReminders = onSchedule('every 15 minutes', async () => {
  const now = Date.now();
  const HOUR = 3_600_000;
  const windows = [
    { flag: 'remind1hSent', from: now + 0.75 * HOUR, to: now + 1.25 * HOUR, text: 'starts in about an hour' },
    { flag: 'remind24hSent', from: now + 23.5 * HOUR, to: now + 24.5 * HOUR, text: 'is tomorrow' },
  ];

  for (const w of windows) {
    const snap = await db
      .collectionGroup('events')
      .where('startsAt', '>=', w.from)
      .where('startsAt', '<=', w.to)
      .get();
    for (const doc of snap.docs) {
      const e = doc.data();
      if (e[w.flag]) {
        continue;
      }
      await doc.ref.update({ [w.flag]: true });
      await getMessaging().send({
        topic: `event_${doc.id}`,
        notification: { title: e.title, body: `${e.title} ${w.text} at ${e.venue}.` },
        data: { kind: 'official', eventId: doc.id },
      });
    }
  }
});
