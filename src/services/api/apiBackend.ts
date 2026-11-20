import { askNotificationPermission, getNotificationPermission } from '../push/permission';
import { deleteFcmToken, getFcmToken } from '../push/fcm';
import { API_URL } from '../../config/env';
import type {
  AdminMember,
  Leaderboard,
  LostItem,
  LostReply,
  PointsSummary,
  Redemption,
  Reward,
  RewardsView,
  StudentCard,
  CardVerification,
  WaitingRedemption,
  Album,
  AlbumView,
  Photo,
  Society,
  SocietyDetail,
  SocietyMember,
  AuthUser,
  CampusEvent,
  CheckInResult,
  CodeSent,
  DevAccount,
  EventRsvp,
  GuestPass,
  Me,
  Post,
  PostComment,
  University,
  Unsubscribe,
} from '../../types/domain';
import type { AppNotification, ChatMessage, ChatSummary, Person, Book, BookInterested, CvData, Job, MediaPicture, ModerationReport, NoteDetail, NotesList, StudyGroup, StudyGroupDetail, StudyNote } from '../../types/domain';
import type { Backend, EventsSnapshot, FeedSnapshot, NotificationsSnapshot } from '../types';
import { getGoogleIdToken, googleSignOut } from './google';
import { ApiError, api, clearSession, currentRefreshToken, hasStoredSession, onSessionEnded, saveSession } from './http';
import { Topic, TopicMap } from './topic';

/**
 * The only backend: talks to the CampusHub API over HTTPS.
 *
 * Reads go through `Topic`s (fetch on a timer + after every change). Writes call the API and then
 * refresh the affected topic, so the screen shows the real result from the server, never a guess.
 */

interface SessionResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ── data topics ──────────────────────────────────────────────────────────────

const meTopic = new Topic<Me>(async () => {
  const r = await api<Me & { user: AuthUser }>('GET', '/v1/me');
  return { membership: r.membership, university: r.university };
}, 8_000);

const feedTopic = new Topic<FeedSnapshot>(async () => {
  const r = await api<{ posts: Post[]; state: { liked: string[]; bookmarked: string[] } }>('GET', '/v1/posts?limit=100');
  return { posts: r.posts, liked: r.state.liked, bookmarked: r.state.bookmarked };
}, 10_000);

const eventsTopic = new Topic<EventsSnapshot>(async () => {
  const r = await api<{ events: CampusEvent[]; myRsvps: Record<string, EventRsvp> }>('GET', '/v1/events');
  return { events: r.events, rsvps: r.myRsvps };
}, 10_000);

const myPassesTopic = new Topic<GuestPass[]>(async () => (await api<{ passes: GuestPass[] }>('GET', '/v1/guest-passes')).passes, 15_000);
const pendingPassesTopic = new Topic<GuestPass[]>(async () => (await api<{ passes: GuestPass[] }>('GET', '/v1/guest-passes/pending')).passes, 10_000);
const notificationsTopic = new Topic<NotificationsSnapshot>(async () => api<NotificationsSnapshot>('GET', '/v1/notifications'), 10_000);
const societiesTopic = new Topic<Society[]>(async () => (await api<{ societies: Society[] }>('GET', '/v1/societies')).societies, 20_000);

/** Picture links come from the server as paths; the app needs full web addresses. */
const absPhoto = (p: Photo): Photo => ({ ...p, url: `${API_URL}${p.url}`, thumbUrl: `${API_URL}${p.thumbUrl}` });
const absMedia = (m: MediaPicture): MediaPicture => ({ ...m, url: `${API_URL}${m.url}`, thumbUrl: `${API_URL}${m.thumbUrl}` });
const absBook = (b: Book): Book => ({ ...b, photos: b.photos.map(absMedia) });
const absAlbum = (a: Album): Album => (a.cover ? { ...a, cover: { ...a.cover, thumbUrl: `${API_URL}${a.cover.thumbUrl}` } } : a);
const albumsTopic = new Topic<Album[]>(async () => (await api<{ albums: Album[] }>('GET', '/v1/albums')).albums.map(absAlbum), 20_000);

const pointsTopic = new Topic<PointsSummary>(() => api<PointsSummary>('GET', '/v1/points/me'), 30_000);

const commentTopics = new TopicMap<PostComment[]>(
  id => new Topic(async () => (await api<{ comments: PostComment[] }>('GET', `/v1/posts/${id}/comments`)).comments, 8_000),
);

/** Forget cached data when the signed-in person changes. */
function resetData() {
  [meTopic, feedTopic, eventsTopic, myPassesTopic, pendingPassesTopic, notificationsTopic, societiesTopic, albumsTopic, pointsTopic].forEach(t => t.reset());
  commentTopics.resetAll();
}

// ── sign-in state ────────────────────────────────────────────────────────────

let currentUser: AuthUser | null = null;
let started = false;
const authListeners = new Set<(u: AuthUser | null) => void>();
const emitAuth = () => authListeners.forEach(cb => cb(currentUser));

async function startSession(): Promise<void> {
  if (started) {
    return;
  }
  started = true;
  onSessionEnded(() => {
    currentUser = null;
    resetData();
    emitAuth();
  });
  if (!(await hasStoredSession())) {
    emitAuth();
    return;
  }
  try {
    const me = await api<{ user: AuthUser }>('GET', '/v1/me');
    currentUser = me.user;
  } catch (err) {
    // Offline at start-up: keep the session and let the app try again. Anything else means signed out.
    if (err instanceof ApiError && err.code === 'network') {
      currentUser = { uid: 'offline', name: 'Offline', email: '' };
    } else {
      currentUser = null;
    }
  }
  emitAuth();
}

async function adoptSession(res: SessionResponse): Promise<AuthUser> {
  await saveSession(res);
  resetData();
  currentUser = res.user;
  emitAuth();
  return res.user;
}

export const apiBackend: Backend = {
  auth: {
    async listDevAccounts() {
      try {
        return (await api<{ accounts: DevAccount[] }>('GET', '/v1/dev/accounts', undefined, { auth: false })).accounts;
      } catch {
        return []; // not a development server
      }
    },
    async signInDev(email, name) {
      return adoptSession(await api<SessionResponse>('POST', '/v1/auth/dev', { email, ...(name ? { name } : {}) }, { auth: false }));
    },
    async signInWithGoogle() {
      const idToken = await getGoogleIdToken();
      return adoptSession(await api<SessionResponse>('POST', '/v1/auth/google', { idToken }, { auth: false }));
    },
    async register(name, email, password) {
      return api<CodeSent>('POST', '/v1/auth/register', { name, email, password }, { auth: false });
    },
    async verifyEmail(email, code) {
      return adoptSession(await api<SessionResponse>('POST', '/v1/auth/verify-email', { email, code }, { auth: false }));
    },
    async signInWithPassword(email, password) {
      const res = await api<({ status: 'ok' } & SessionResponse) | ({ status: 'otp_required' } & CodeSent)>(
        'POST',
        '/v1/auth/login',
        { email, password },
        { auth: false },
      );
      if (res.status === 'ok') {
        return { status: 'ok', user: await adoptSession(res) };
      }
      return { status: 'otp_required', email: res.email, resendAfterSeconds: res.resendAfterSeconds };
    },
    async verifyLoginCode(email, code) {
      return adoptSession(await api<SessionResponse>('POST', '/v1/auth/login/verify', { email, code }, { auth: false }));
    },
    resendCode: (email, purpose) => api<CodeSent>('POST', '/v1/auth/otp/resend', { email, purpose }, { auth: false }),
    forgotPassword: email => api<CodeSent>('POST', '/v1/auth/forgot', { email }, { auth: false }),
    async resetPassword(email, code, newPassword) {
      await api('POST', '/v1/auth/reset', { email, code, newPassword }, { auth: false });
    },
    async devPeekCode(email) {
      try {
        const r = await api<{ emails: { code: string | null }[] }>('GET', `/v1/dev/outbox?to=${encodeURIComponent(email)}`, undefined, { auth: false });
        return r.emails.find(m => m.code)?.code ?? null;
      } catch {
        return null; // a real server has no outbox
      }
    },
    async signOut() {
      const refreshToken = await currentRefreshToken();
      await apiBackend.push.unregisterDevice().catch(() => undefined);
      if (refreshToken) {
        await api('POST', '/v1/auth/logout', { refreshToken }, { auth: false }).catch(() => undefined);
      }
      await googleSignOut();
      await clearSession();
      resetData();
      currentUser = null;
      emitAuth();
    },
    onAuthStateChanged(cb): Unsubscribe {
      authListeners.add(cb);
      if (!started) {
        void startSession();
      } else {
        cb(currentUser);
      }
      return () => {
        authListeners.delete(cb);
      };
    },
  },

  universities: {
    async list(): Promise<University[]> {
      return (await api<{ universities: University[] }>('GET', '/v1/universities', undefined, { auth: false })).universities;
    },
  },

  membership: {
    async getMe() {
      await meTopic.refresh();
      return meTopic.last ?? { membership: null, university: null };
    },
    subscribeMe: cb => meTopic.subscribe(cb),
    async submitJoinRequest({ university, studentId, department, batch }) {
      await api('POST', '/v1/membership', { universityId: university.id, studentId, department, batch });
      await meTopic.refresh();
    },
    async leaveUniversity() {
      await api('DELETE', '/v1/membership');
      resetData();
    },
    async deleteAccount() {
      await api('DELETE', '/v1/me');
      await googleSignOut();
      await clearSession();
      resetData();
      currentUser = null;
      emitAuth();
    },
  },

  admin: {
    async listMembers(status) {
      return (await api<{ members: AdminMember[] }>('GET', `/v1/admin/members${status ? `?status=${status}` : ''}`)).members;
    },
    decide: (userId, patch) => api<AdminMember>('PATCH', `/v1/admin/members/${userId}`, patch),
  },

  posts: {
    subscribeFeed: cb => feedTopic.subscribe(cb),
    subscribeComments: (postId, cb) => commentTopics.get(postId).subscribe(cb),
    async createPost(input) {
      const post = await api<Post>('POST', '/v1/posts', input);
      await feedTopic.refresh();
      return post;
    },
    async setLike(postId, liked) {
      await api(liked ? 'PUT' : 'DELETE', `/v1/posts/${postId}/like`);
      await feedTopic.refresh();
    },
    async setBookmark(postId, saved) {
      await api(saved ? 'PUT' : 'DELETE', `/v1/posts/${postId}/bookmark`);
      await feedTopic.refresh();
    },
    async addComment(postId, text) {
      await api('POST', `/v1/posts/${postId}/comments`, { text });
      await Promise.all([commentTopics.get(postId).refresh(), feedTopic.refresh()]);
    },
    async deletePost(postId) {
      await api('DELETE', `/v1/posts/${postId}`);
      await feedTopic.refresh();
    },
    async deleteComment(postId, commentId) {
      await api('DELETE', `/v1/posts/${postId}/comments/${commentId}`);
      await Promise.all([commentTopics.get(postId).refresh(), feedTopic.refresh()]);
    },
    async markRead(postId) {
      await api('POST', `/v1/posts/${postId}/read`);
    },
  },

  events: {
    subscribeEvents: cb => eventsTopic.subscribe(cb),
    async createEvent(input) {
      const created = await api<CampusEvent>('POST', '/v1/events', input);
      await eventsTopic.refresh();
      return created.id;
    },
    async rsvp(eventId, status) {
      const rsvp = await api<EventRsvp>('PUT', `/v1/events/${eventId}/rsvp`, { status });
      await eventsTopic.refresh();
      return rsvp;
    },
    async cancelRsvp(eventId) {
      await api('DELETE', `/v1/events/${eventId}/rsvp`);
      await Promise.all([eventsTopic.refresh(), myPassesTopic.refresh()]);
    },
    async setVolunteer(eventId, volunteer) {
      await api('PUT', `/v1/events/${eventId}/volunteer`, { volunteer });
      await eventsTopic.refresh();
    },
    async submitFeedback(eventId, rating, comment) {
      await api('PUT', `/v1/events/${eventId}/feedback`, { rating, comment });
      await eventsTopic.refresh();
    },
    async checkIn(payload, eventId) {
      const result = await api<CheckInResult>('POST', '/v1/checkin', { payload, ...(eventId ? { eventId } : {}) });
      await eventsTopic.refresh();
      return result;
    },
    subscribeMyPasses: cb => myPassesTopic.subscribe(cb),
    subscribePendingPasses: cb => pendingPassesTopic.subscribe(cb),
    async createGuestPass(eventId, guestName, guestPhone) {
      await api('POST', `/v1/events/${eventId}/guest-passes`, { guestName, guestPhone });
      await Promise.all([myPassesTopic.refresh(), eventsTopic.refresh()]);
    },
    async decideGuestPass(passId, approve) {
      await api('PATCH', `/v1/guest-passes/${passId}`, { approve });
      await pendingPassesTopic.refresh();
    },
  },

  societies: {
    subscribeList: cb => societiesTopic.subscribe(cb),
    get: id => api<SocietyDetail>('GET', `/v1/societies/${id}`),
    async members(id) {
      return (await api<{ members: SocietyMember[] }>('GET', `/v1/societies/${id}/members`)).members;
    },
    async create(input) {
      const s = await api<Society>('POST', '/v1/societies', input);
      await societiesTopic.refresh();
      return s;
    },
    async update(id, patch) {
      const s = await api<Society>('PATCH', `/v1/societies/${id}`, patch);
      await societiesTopic.refresh();
      return s;
    },
    async remove(id) {
      await api('DELETE', `/v1/societies/${id}`);
      await Promise.all([societiesTopic.refresh(), eventsTopic.refresh(), feedTopic.refresh(), meTopic.refresh()]);
    },
    async join(id) {
      const s = await api<Society>('PUT', `/v1/societies/${id}/join`);
      await societiesTopic.refresh();
      return s;
    },
    async leave(id) {
      const s = await api<Society>('DELETE', `/v1/societies/${id}/join`);
      await Promise.all([societiesTopic.refresh(), meTopic.refresh()]);
      return s;
    },
    async assignHead(id, userId) {
      await api('PUT', `/v1/societies/${id}/heads/${userId}`);
      await societiesTopic.refresh();
    },
    async removeHead(id, userId) {
      await api('DELETE', `/v1/societies/${id}/heads/${userId}`);
      await Promise.all([societiesTopic.refresh(), meTopic.refresh()]);
    },
  },

  albums: {
    subscribeList: cb => albumsTopic.subscribe(cb),
    async open(id, before) {
      const r = await api<AlbumView>('GET', `/v1/albums/${id}${before ? `?before=${before}` : ''}`);
      return { ...r, album: absAlbum(r.album), photos: r.photos.map(absPhoto) };
    },
    async create(input) {
      const a = await api<Album>('POST', '/v1/albums', input);
      await albumsTopic.refresh();
      return absAlbum(a);
    },
    async update(id, patch) {
      const a = await api<Album>('PATCH', `/v1/albums/${id}`, patch);
      await albumsTopic.refresh();
      return absAlbum(a);
    },
    async remove(id) {
      await api('DELETE', `/v1/albums/${id}`);
      await albumsTopic.refresh();
    },
    async upload(albumId, files) {
      const form = new FormData();
      files.forEach(f => form.append('photos', { uri: f.uri, name: f.name, type: f.type } as unknown as Blob));
      const r = await api<{ photos: Photo[] }>('POST', `/v1/albums/${albumId}/photos`, form);
      await albumsTopic.refresh();
      return r.photos.map(absPhoto);
    },
    async deletePhoto(photoId) {
      await api('DELETE', `/v1/photos/${photoId}`);
      await albumsTopic.refresh();
    },
    setLike: (photoId, liked) => api<{ liked: boolean; likeCount: number }>(liked ? 'PUT' : 'DELETE', `/v1/photos/${photoId}/like`),
  },

  points: {
    subscribeMe: cb => pointsTopic.subscribe(cb),
    async setVisibility(visible) {
      await api('PATCH', '/v1/points/visibility', { visible });
      await pointsTopic.refresh();
    },
    leaderboard: (scope, period) => api<Leaderboard>('GET', `/v1/leaderboard?scope=${scope}&period=${period}`),
  },

  rewards: {
    list: () => api<RewardsView>('GET', '/v1/rewards'),
    create: input => api<Reward>('POST', '/v1/rewards', input),
    update: (id, patch) => api<Reward>('PATCH', `/v1/rewards/${id}`, patch),
    async redeem(id) {
      const r = await api<{ id: string; code: string; title: string; cost: number; balance: number }>('POST', `/v1/rewards/${id}/redeem`);
      await pointsTopic.refresh();
      return r;
    },
    async mine() {
      return (await api<{ redemptions: Redemption[] }>('GET', '/v1/redemptions/mine')).redemptions;
    },
    async cancel(id) {
      await api('POST', `/v1/redemptions/${id}/cancel`);
      await pointsTopic.refresh();
    },
    async waiting() {
      return (await api<{ redemptions: WaitingRedemption[] }>('GET', '/v1/redemptions')).redemptions;
    },
    collect: code => api<{ title: string; student: string }>('POST', '/v1/redemptions/collect', { code }),
  },

  lostFound: {
    async list(status = 'open') {
      return (await api<{ items: LostItem[] }>('GET', `/v1/lost-found?status=${status}`)).items;
    },
    create: input => api<LostItem>('POST', '/v1/lost-found', input),
    async reply(id) {
      await api('POST', `/v1/lost-found/${id}/reply`);
    },
    async replies(id) {
      return (await api<{ replies: LostReply[] }>('GET', `/v1/lost-found/${id}/replies`)).replies;
    },
    resolve: id => api<LostItem>('POST', `/v1/lost-found/${id}/resolve`),
    async remove(id) {
      await api('DELETE', `/v1/lost-found/${id}`);
    },
  },

  card: {
    get: () => api<StudentCard>('GET', '/v1/card'),
    verify: payload => api<CardVerification>('POST', '/v1/card/verify', { payload }),
  },

  study: {
    async listNotes(f) {
      const qs = new URLSearchParams();
      if (f.q) { qs.set('q', f.q); }
      if (f.kind) { qs.set('kind', f.kind); }
      if (f.course) { qs.set('course', f.course); }
      return api<NotesList>('GET', `/v1/notes?${qs.toString()}`);
    },
    async note(id) {
      const n = await api<NoteDetail>('GET', `/v1/notes/${id}`);
      return { ...n, files: n.files.map(x => ({ ...x, url: `${API_URL}${x.url}` })) };
    },
    async uploadNote(input) {
      const form = new FormData();
      form.append('title', input.title);
      form.append('course', input.course);
      form.append('kind', input.kind);
      form.append('description', input.description);
      input.files.forEach(f => form.append('files', { uri: f.uri, name: f.name, type: f.type } as unknown as Blob));
      return api<StudyNote>('POST', '/v1/notes', form);
    },
    setHelpful: (id, helpful) => api<{ iFoundHelpful: boolean; helpfulCount: number }>(helpful ? 'PUT' : 'DELETE', `/v1/notes/${id}/helpful`),
    async removeNote(id) {
      await api('DELETE', `/v1/notes/${id}`);
    },

    async listBooks(f) {
      const qs = new URLSearchParams({ scope: f.scope });
      if (f.q) { qs.set('q', f.q); }
      return (await api<{ books: Book[] }>('GET', `/v1/books?${qs.toString()}`)).books.map(absBook);
    },
    async book(id) {
      return absBook(await api<Book>('GET', `/v1/books/${id}`));
    },
    async createBook(input) {
      let mediaIds: string[] = [];
      if (input.photos.length > 0) {
        const form = new FormData();
        input.photos.forEach(f => form.append('photos', { uri: f.uri, name: f.name, type: f.type } as unknown as Blob));
        mediaIds = (await api<{ media: { id: string }[] }>('POST', '/v1/media', form)).media.map(m => m.id);
      }
      const { photos: _photos, ...rest } = input;
      return absBook(await api<Book>('POST', '/v1/books', { ...rest, mediaIds }));
    },
    async updateBook(id, patch) {
      return absBook(await api<Book>('PATCH', `/v1/books/${id}`, patch));
    },
    async removeBook(id) {
      await api('DELETE', `/v1/books/${id}`);
    },
    async askAboutBook(id) {
      await api('POST', `/v1/books/${id}/interest`);
    },
    async bookInterested(id) {
      return (await api<{ interested: BookInterested[] }>('GET', `/v1/books/${id}/interested`)).interested;
    },

    async listGroups(f) {
      const qs = new URLSearchParams({ scope: f.scope });
      if (f.q) { qs.set('q', f.q); }
      return (await api<{ groups: StudyGroup[] }>('GET', `/v1/study-groups?${qs.toString()}`)).groups;
    },
    group: id => api<StudyGroupDetail>('GET', `/v1/study-groups/${id}`),
    createGroup: input => api<StudyGroup>('POST', '/v1/study-groups', input),
    async joinGroup(id) {
      await api('PUT', `/v1/study-groups/${id}/join`);
    },
    async leaveGroup(id) {
      await api('DELETE', `/v1/study-groups/${id}/join`);
    },
    async closeGroup(id) {
      await api('PATCH', `/v1/study-groups/${id}`, { status: 'closed' });
    },
    async removeGroup(id) {
      await api('DELETE', `/v1/study-groups/${id}`);
    },
  },

  career: {
    async listJobs(f) {
      const qs = new URLSearchParams({ scope: f.scope });
      if (f.kind) { qs.set('kind', f.kind); }
      if (f.q) { qs.set('q', f.q); }
      if (f.includeClosed) { qs.set('include', 'closed'); }
      return (await api<{ jobs: Job[] }>('GET', `/v1/jobs?${qs.toString()}`)).jobs;
    },
    createJob: input => api<Job>('POST', '/v1/jobs', input),
    async setJobClosed(id, closed) {
      await api('PATCH', `/v1/jobs/${id}`, { status: closed ? 'closed' : 'open' });
    },
    async removeJob(id) {
      await api('DELETE', `/v1/jobs/${id}`);
    },
    async saveJob(id, saved) {
      await api(saved ? 'PUT' : 'DELETE', `/v1/jobs/${id}/save`);
    },
    cv: () => api<CvData>('GET', '/v1/cv'),
    async saveCvProfile(input) {
      await api('PUT', '/v1/cv/profile', input);
    },
  },

  reports: {
    async report(input) {
      await api('POST', '/v1/reports', input);
    },
    async list(status = 'open') {
      return (await api<{ reports: ModerationReport[] }>('GET', `/v1/admin/reports?status=${status}`)).reports;
    },
    async resolve(id, action) {
      await api('POST', `/v1/admin/reports/${id}`, { action });
    },
  },
  chat: {
    async list() {
      return (await api<{ chats: ChatSummary[] }>('GET', '/v1/chats')).chats;
    },
    async people(q) {
      return (await api<{ people: Person[] }>('GET', `/v1/people?q=${encodeURIComponent(q)}`)).people;
    },
    startDm: userId => api<{ id: string; title: string }>('POST', '/v1/chats/dm', { userId }),
    room: (kind, id) => api<{ id: string; title: string }>('GET', `/v1/chats/${kind}/${id}`),
    async messages(id, after) {
      return (await api<{ messages: ChatMessage[] }>('GET', `/v1/chats/${id}/messages${after ? `?after=${after}` : ''}`)).messages;
    },
    send: (id, body) => api<ChatMessage>('POST', `/v1/chats/${id}/messages`, { body }),
    async markRead(id) {
      await api('POST', `/v1/chats/${id}/read`);
    },
    async block(userId, blocked) {
      await api(blocked ? 'PUT' : 'DELETE', `/v1/users/${userId}/block`);
    },
  },

  notifications: {
    subscribe: cb => notificationsTopic.subscribe(cb),
    async markRead(id) {
      await api('POST', `/v1/notifications/${id}/read`);
      await notificationsTopic.refresh();
    },
    async markAllRead() {
      await api('POST', '/v1/notifications/read-all');
      await notificationsTopic.refresh();
    },
  },

  push: {
    getPermission: getNotificationPermission,
    requestPermission: askNotificationPermission,
    async registerDevice() {
      const token = await getFcmToken();
      if (token) {
        await api('PUT', '/v1/devices', { token, platform: 'android' });
      }
    },
    async unregisterDevice() {
      const token = await getFcmToken();
      if (token) {
        await api('DELETE', `/v1/devices/${encodeURIComponent(token)}`).catch(() => undefined);
        await deleteFcmToken();
      }
    },
  },
};

export type { AppNotification };
