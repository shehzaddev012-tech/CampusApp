import type {
  AdminMember,
  BoardPeriod,
  BoardScope,
  CardVerification,
  Leaderboard,
  LostItem,
  LostReply,
  NewLostItemInput,
  ChatMessage, ChatSummary, Person, Book, BookInterested, CvData, CvProfileInput, Job, JobKind, ModerationReport, NewBookInput, NewGroupInput, NewJobInput, NewNoteInput, NoteDetail, NoteKind, NotesList, ReportReason, ReportTarget, StudyGroup, StudyGroupDetail, StudyNote,
  NewRewardInput,
  PointsSummary,
  Redemption,
  Reward,
  RewardsView,
  StudentCard,
  WaitingRedemption,
  Album,
  AlbumView,
  AppNotification,
  EventCategory,
  NewAlbumInput,
  NewSocietyInput,
  Photo,
  PickedPhoto,
  Society,
  SocietyDetail,
  SocietyMember,
  AuthUser,
  CampusEvent,
  CheckInResult,
  CodePurpose,
  CodeSent,
  DevAccount,
  EventRsvp,
  GuestPass,
  JoinRequestInput,
  Me,
  MemberStatus,
  NewEventInput,
  NewPostInput,
  PasswordSignIn,
  Post,
  PostComment,
  PushPermission,
  Role,
  University,
  Unsubscribe,
} from '../types/domain';

/**
 * What the app needs from a backend. There is one implementation: the CampusHub API
 * (src/services/api). The server works out WHO is asking and WHICH university they belong to from
 * the sign-in token, so no method here takes a user or university id.
 *
 * `subscribe*` methods deliver the current data straight away and again whenever it changes.
 */

export interface AuthService {
  /** Is development sign-in (pick a test account) available on this server? */
  listDevAccounts(): Promise<DevAccount[]>;
  /** Development only: sign in as a test account (or a brand new one). */
  signInDev(email: string, name?: string): Promise<AuthUser>;
  signInWithGoogle(): Promise<AuthUser>;

  /** Sign-up step 1: the server emails a code. Nothing is created until it is confirmed. */
  register(name: string, email: string, password: string): Promise<CodeSent>;
  /** Sign-up step 2: confirms the emailed code, creates the account and signs in. */
  verifyEmail(email: string, code: string): Promise<AuthUser>;
  /** Email + password. Usually answers otp_required (a code was emailed), see verifyLoginCode. */
  signInWithPassword(email: string, password: string): Promise<PasswordSignIn>;
  verifyLoginCode(email: string, code: string): Promise<AuthUser>;
  resendCode(email: string, purpose: CodePurpose): Promise<CodeSent>;
  forgotPassword(email: string): Promise<CodeSent>;
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
  /** Development server only: the code in the newest email it "sent" (null on a real server). */
  devPeekCode(email: string): Promise<string | null>;
  signOut(): Promise<void>;
  /** Fires with the current user (or null) straight away, and on every change. */
  onAuthStateChanged(cb: (user: AuthUser | null) => void): Unsubscribe;
}

export interface UniversityService {
  list(): Promise<University[]>;
}

export interface MembershipService {
  getMe(): Promise<Me>;
  /** Re-checks my membership regularly, so an approval shows up without restarting the app. */
  subscribeMe(cb: (me: Me) => void): Unsubscribe;
  submitJoinRequest(input: JoinRequestInput): Promise<void>;
  /** Leave the university (to join another). */
  leaveUniversity(): Promise<void>;
  /** Permanently deletes my account and data. */
  deleteAccount(): Promise<void>;
}

export interface AdminService {
  listMembers(status?: MemberStatus): Promise<AdminMember[]>;
  decide(userId: string, patch: { status?: MemberStatus; role?: Role }): Promise<AdminMember>;
}

export interface FeedSnapshot {
  posts: Post[];
  liked: string[];
  bookmarked: string[];
}

export interface PostService {
  subscribeFeed(cb: (feed: FeedSnapshot) => void): Unsubscribe;
  subscribeComments(postId: string, cb: (comments: PostComment[]) => void): Unsubscribe;
  createPost(input: NewPostInput): Promise<Post>;
  setLike(postId: string, liked: boolean): Promise<void>;
  setBookmark(postId: string, saved: boolean): Promise<void>;
  addComment(postId: string, text: string): Promise<void>;
  /** The author or an admin. */
  deletePost(postId: string): Promise<void>;
  /** The comment's author or an admin. */
  deleteComment(postId: string, commentId: string): Promise<void>;
  /** Records that I have seen the post (counted once per student). */
  markRead(postId: string): Promise<void>;
}

export interface EventsSnapshot {
  events: CampusEvent[];
  /** My ticket / RSVP for each event, keyed by event id. */
  rsvps: Record<string, EventRsvp>;
}

export interface EventService {
  subscribeEvents(cb: (snapshot: EventsSnapshot) => void): Unsubscribe;
  createEvent(input: NewEventInput): Promise<string>;
  /** Takes a seat when one is free, otherwise joins the waiting list. 'interested' never uses a seat. */
  rsvp(eventId: string, status: 'going' | 'interested'): Promise<EventRsvp>;
  /** Gives up a seat or interest. A freed seat goes to the first student on the waiting list. */
  cancelRsvp(eventId: string): Promise<void>;
  setVolunteer(eventId: string, volunteer: boolean): Promise<void>;
  submitFeedback(eventId: string, rating: number, comment: string): Promise<void>;
  /** Validates a scanned QR payload and marks the ticket or guest pass as used. */
  checkIn(payload: string, eventId?: string): Promise<CheckInResult>;

  subscribeMyPasses(cb: (passes: GuestPass[]) => void): Unsubscribe;
  /** Passes waiting for a decision (staff only). */
  subscribePendingPasses(cb: (passes: GuestPass[]) => void): Unsubscribe;
  createGuestPass(eventId: string, guestName: string, guestPhone: string): Promise<void>;
  decideGuestPass(passId: string, approve: boolean): Promise<void>;
}

export interface SocietyService {
  subscribeList(cb: (societies: Society[]) => void): Unsubscribe;
  get(id: string): Promise<SocietyDetail>;
  members(id: string): Promise<SocietyMember[]>;
  /** Admin only. */
  create(input: NewSocietyInput): Promise<Society>;
  /** The society's head or an admin. */
  update(id: string, patch: Partial<NewSocietyInput>): Promise<Society>;
  /** Admin only. */
  remove(id: string): Promise<void>;
  join(id: string): Promise<Society>;
  leave(id: string): Promise<Society>;
  /** Admin only. */
  assignHead(id: string, userId: string): Promise<void>;
  removeHead(id: string, userId: string): Promise<void>;
}

export interface AlbumService {
  subscribeList(cb: (albums: Album[]) => void): Unsubscribe;
  /** Pictures newest first; pass `before` (from `nextBefore`) for the next page. */
  open(id: string, before?: number): Promise<AlbumView>;
  create(input: NewAlbumInput): Promise<Album>;
  update(id: string, patch: { title?: string; category?: EventCategory }): Promise<Album>;
  remove(id: string): Promise<void>;
  /** Uploads pictures chosen on the phone (up to 10 at a time). */
  upload(albumId: string, files: PickedPhoto[]): Promise<Photo[]>;
  deletePhoto(photoId: string): Promise<void>;
  setLike(photoId: string, liked: boolean): Promise<{ liked: boolean; likeCount: number }>;
}

export interface PointsService {
  /** My points, level, badges and recent activity (refreshed regularly). */
  subscribeMe(cb: (me: PointsSummary) => void): Unsubscribe;
  setVisibility(visible: boolean): Promise<void>;
  leaderboard(scope: BoardScope, period: BoardPeriod): Promise<Leaderboard>;
}

export interface RewardService {
  list(): Promise<RewardsView>;
  /** Admin only. */
  create(input: NewRewardInput): Promise<Reward>;
  /** Admin only. */
  update(id: string, patch: Partial<NewRewardInput> & { active?: boolean }): Promise<Reward>;
  redeem(id: string): Promise<{ id: string; code: string; title: string; cost: number; balance: number }>;
  mine(): Promise<Redemption[]>;
  cancel(id: string): Promise<void>;
  /** Admin: rewards waiting to be handed over (no codes). */
  waiting(): Promise<WaitingRedemption[]>;
  /** Admin: the student shows a code; this hands the reward over. */
  collect(code: string): Promise<{ title: string; student: string }>;
}

export interface LostFoundService {
  list(status?: 'open' | 'resolved' | 'all'): Promise<LostItem[]>;
  create(input: NewLostItemInput): Promise<LostItem>;
  /** "I found it" / "this is mine": tells the poster. */
  reply(id: string): Promise<void>;
  replies(id: string): Promise<LostReply[]>;
  resolve(id: string): Promise<LostItem>;
  remove(id: string): Promise<void>;
}

export interface CardService {
  get(): Promise<StudentCard>;
  /** Gate staff: who does this card belong to? */
  verify(payload: string): Promise<CardVerification>;
}

export interface StudyService {
  listNotes(filter: { q?: string; kind?: NoteKind; course?: string }): Promise<NotesList>;
  note(id: string): Promise<NoteDetail>;
  uploadNote(input: NewNoteInput): Promise<StudyNote>;
  setHelpful(id: string, helpful: boolean): Promise<{ iFoundHelpful: boolean; helpfulCount: number }>;
  removeNote(id: string): Promise<void>;

  listBooks(filter: { scope: 'market' | 'mine'; q?: string }): Promise<Book[]>;
  book(id: string): Promise<Book>;
  createBook(input: NewBookInput): Promise<Book>;
  updateBook(id: string, patch: { status?: 'available' | 'reserved' | 'sold'; price?: number }): Promise<Book>;
  removeBook(id: string): Promise<void>;
  askAboutBook(id: string): Promise<void>;
  bookInterested(id: string): Promise<BookInterested[]>;

  listGroups(filter: { scope: 'open' | 'mine'; q?: string }): Promise<StudyGroup[]>;
  group(id: string): Promise<StudyGroupDetail>;
  createGroup(input: NewGroupInput): Promise<StudyGroup>;
  joinGroup(id: string): Promise<void>;
  leaveGroup(id: string): Promise<void>;
  closeGroup(id: string): Promise<void>;
  removeGroup(id: string): Promise<void>;
}

export interface CareerService {
  listJobs(filter: { scope: 'open' | 'saved'; kind?: JobKind; q?: string; includeClosed?: boolean }): Promise<Job[]>;
  createJob(input: NewJobInput): Promise<Job>;
  setJobClosed(id: string, closed: boolean): Promise<void>;
  removeJob(id: string): Promise<void>;
  saveJob(id: string, saved: boolean): Promise<void>;
  cv(): Promise<CvData>;
  saveCvProfile(input: CvProfileInput): Promise<void>;
}

export interface ReportService {
  report(input: { targetType: ReportTarget; targetId: string; reason: ReportReason; details?: string }): Promise<void>;
  /** Admin: open reports, and what to do with them. */
  list(status?: 'open' | 'actioned' | 'dismissed'): Promise<ModerationReport[]>;
  resolve(id: string, action: 'remove' | 'dismiss'): Promise<void>;
}

export interface ChatService {
  list(): Promise<ChatSummary[]>;
  people(q: string): Promise<Person[]>;
  startDm(userId: string): Promise<{ id: string; title: string }>;
  room(kind: 'society' | 'group', id: string): Promise<{ id: string; title: string }>;
  /** Newest 50, oldest first. Pass `after` (ms) to get only newer ones. */
  messages(id: string, after?: number): Promise<ChatMessage[]>;
  send(id: string, body: string): Promise<ChatMessage>;
  markRead(id: string): Promise<void>;
  block(userId: string, blocked: boolean): Promise<void>;
}

export interface NotificationsSnapshot {
  notifications: AppNotification[];
  unread: number;
}

export interface NotificationService {
  subscribe(cb: (snapshot: NotificationsSnapshot) => void): Unsubscribe;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface PushService {
  getPermission(): Promise<PushPermission>;
  /** Shows the system permission prompt. Resolves true when granted. */
  requestPermission(): Promise<boolean>;
  /** Registers this phone with the server so it can receive pushes. No-op until Firebase is configured. */
  registerDevice(): Promise<void>;
  unregisterDevice(): Promise<void>;
}

export interface Backend {
  auth: AuthService;
  universities: UniversityService;
  membership: MembershipService;
  admin: AdminService;
  posts: PostService;
  events: EventService;
  societies: SocietyService;
  albums: AlbumService;
  points: PointsService;
  rewards: RewardService;
  lostFound: LostFoundService;
  card: CardService;
  study: StudyService;
  career: CareerService;
  reports: ReportService;
  chat: ChatService;
  notifications: NotificationService;
  push: PushService;
}
