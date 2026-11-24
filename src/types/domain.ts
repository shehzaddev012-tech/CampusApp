/** Core domain types shared across the app. */

export type Role =
  | 'student'
  | 'society_head'
  | 'uni_admin'
  | 'security';

/** An IAC student ID: IAC-FA22-BCS-021 (the intake, the programme, the roll number). The server checks the same rule. */
export const STUDENT_ID_RE = /^IAC-[A-Z]{2}\d{2}-[A-Z]{2,6}-\d{2,4}$/;

export type MembershipStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export interface University {
  id: string;
  /** Short name shown everywhere (e.g. "IAC"). */
  name: string;
  fullName: string;
  /** Brand colour applied to the whole app for members of this university. */
  accent: string;
  departments: string[];
  studentCount?: number;
}

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  photoUrl?: string | null;
}

/** Someone's place in a university. This (not the sign-in) is what grants access. */
export interface Membership {
  uid: string;
  universityId: string;
  name: string;
  email: string;
  photoUrl?: string | null;
  studentId: string;
  department: string;
  batch: string;
  role: Role;
  status: MembershipStatus;
}

export interface JoinRequestInput {
  university: University;
  studentId: string;
  department: string;
}

export type Unsubscribe = () => void;

/* ── Events (Module 3) ─────────────────────────────────────────────────── */

export type EventCategory = 'Tech' | 'Sports' | 'Cultural' | 'Career' | 'Social';

export interface ScheduleItem {
  /** Milliseconds since epoch. */
  at: number;
  title: string;
  speaker?: string;
}

export interface CampusEvent {
  id: string;
  universityId: string;
  title: string;
  /** Society or office organising the event. */
  organizer: string;
  category: EventCategory;
  blurb: string;
  venue: string;
  startsAt: number;
  endsAt: number;
  /** null = unlimited seats. */
  capacity: number | null;
  goingCount: number;
  interestedCount: number;
  waitlistCount: number;
  checkedInCount: number;
  volunteersNeeded: number;
  volunteerCount: number;
  schedule: ScheduleItem[];
  /** Society may open it to students of other universities (used by a later module). */
  isPublic: boolean;
  /** The society organising it, when there is one. */
  societyId?: string | null;
  createdBy: string;
  createdAt: number;
}

export interface NewEventInput {
  title: string;
  /** Left out when a society is chosen: the server uses the society's name. */
  organizer?: string;
  societyId?: string | null;
  category: EventCategory;
  blurb: string;
  venue: string;
  startsAt: number;
  endsAt: number;
  capacity: number | null;
  volunteersNeeded: number;
  isPublic: boolean;
}

export type RsvpStatus = 'going' | 'interested' | 'waitlist';

/** A student's relationship with one event. A going RSVP is the ticket. */
export interface EventRsvp {
  eventId: string;
  uid: string;
  studentName: string;
  status: RsvpStatus;
  /** Secret behind the QR ticket. Only set while status === 'going'. */
  code: string | null;
  checkedInAt: number | null;
  volunteer: boolean;
  rating: number | null;
  feedback: string | null;
  createdAt: number;
}

export type GuestPassStatus = 'pending' | 'approved' | 'rejected';

export interface GuestPass {
  id: string;
  eventId: string;
  eventTitle: string;
  hostUid: string;
  hostName: string;
  guestName: string;
  guestPhone: string;
  status: GuestPassStatus;
  code: string;
  checkedInAt: number | null;
  createdAt: number;
}

export const MAX_GUESTS_PER_STUDENT = 2;

export type CheckInResult =
  | { ok: true; kind: 'ticket' | 'guest' | 'card'; name: string; detail: string }
  | {
      ok: false;
      reason: 'invalid' | 'wrong_event' | 'not_valid' | 'already_used' | 'pending' | 'closed';
      name?: string;
      detail: string;
    };

/** Roles that may create events, scan tickets and approve guest passes. */
export const EVENT_STAFF: Role[] = ['society_head', 'uni_admin'];
export const SCANNER_ROLES: Role[] = ['security', 'society_head', 'uni_admin'];

export function canCreateEvents(role: Role): boolean {
  return EVENT_STAFF.includes(role);
}
export function canScan(role: Role): boolean {
  return SCANNER_ROLES.includes(role);
}

export function seatsLeft(e: Pick<CampusEvent, 'capacity' | 'goingCount'>): number | null {
  return e.capacity === null ? null : Math.max(0, e.capacity - e.goingCount);
}

/** Who is speaking: the university itself, a society, or an emergency alert. */
export type PostKind = 'official' | 'society' | 'alert';

export interface Post {
  id: string;
  universityId: string;
  kind: PostKind;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  /** Name of the society or office posting (shown as the byline). */
  source: string;
  /** Department channel, or null when the post is for everyone. */
  channel: string | null;
  societyId?: string | null;
  pinned: boolean;
  /** Milliseconds since epoch. */
  createdAt: number;
  likeCount: number;
  commentCount: number;
  readCount: number;
}

export interface NewPostInput {
  kind: PostKind;
  title: string;
  body: string;
  /** Left out for society updates: the server uses the society's name. */
  source?: string;
  societyId?: string | null;
  channel: string | null;
  pinned: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
}

/** What the signed-in student has done with posts. */
export interface UserPostState {
  liked: Record<string, true>;
  bookmarked: Record<string, true>;
}

export interface AppNotification {
  id: string;
  kind: PostKind;
  title: string;
  body: string;
  postId?: string;
  eventId?: string;
  createdAt: number;
  read: boolean;
}

/** The server emailed a 6-digit code. 
esendAfterSeconds is how long until another can be requested. */
export interface CodeSent {
  email: string;
  resendAfterSeconds: number;
}

export type CodePurpose = 'signup' | 'login' | 'reset';

export type PasswordSignIn =
  | { status: 'ok'; user: AuthUser }
  | ({ status: 'otp_required' } & CodeSent);

export type PushPermission = 'granted' | 'denied' | 'undetermined';

/** Roles that may publish each kind of post. The server enforces the same table. */
export const POSTING_ROLES: Record<PostKind, Role[]> = {
  official: ['uni_admin'],
  society: ['society_head', 'uni_admin'],
  alert: ['security', 'uni_admin'],
};

export function allowedPostKinds(role: Role): PostKind[] {
  return (Object.keys(POSTING_ROLES) as PostKind[]).filter(k => POSTING_ROLES[k].includes(role));
}

export const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  society_head: 'Society Head',
  uni_admin: 'Admin',
  security: 'Gate Security',
};


/** What GET /v1/me returns: my membership (null until I join) and its university. */
export interface Me {
  membership: Membership | null;
  university: University | null;
}

/** A member as an admin sees them (approvals). */
export interface AdminMember {
  uid: string;
  name: string;
  email: string;
  photoUrl: string | null;
  studentId: string;
  department: string;
  batch: string;
  role: Role;
  status: MembershipStatus;
  createdAt: number;
}

export type MemberStatus = MembershipStatus;

/** A seeded test account, listed on the development sign-in screen. */
export interface DevAccount {
  email: string;
  name: string;
  role: Role;
  universityId: string;
  department: string;
}

/* ── Societies and photo albums (Module 4) ─────────────────────────────── */

export type SocietyRole = 'member' | 'head';

export interface Society {
  id: string;
  name: string;
  about: string;
  category: EventCategory;
  memberCount: number;
  /** My place in it, or null when I have not joined. */
  myRole: SocietyRole | null;
  joined: boolean;
  nextEvent: { id: string; title: string; startsAt: number } | null;
  createdAt: number;
}

export interface SocietyDetail extends Society {
  heads: { uid: string; name: string; photoUrl: string | null }[];
  upcomingEvents: CampusEvent[];
  recentPosts: { id: string; title: string; createdAt: number }[];
}

export interface SocietyMember {
  uid: string;
  name: string;
  photoUrl: string | null;
  role: SocietyRole;
  joinedAt: number;
}

export interface NewSocietyInput {
  name: string;
  about: string;
  category: EventCategory;
}

export interface Album {
  id: string;
  title: string;
  category: EventCategory;
  eventId: string | null;
  societyId: string | null;
  photoCount: number;
  /** The most-liked picture (or the newest), shown on the album card. */
  cover: { photoId: string; thumbUrl: string; width: number; height: number } | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: number;
  /** I may rename or delete it. */
  canManage: boolean;
}

export interface Photo {
  id: string;
  albumId: string;
  /** Full size and thumbnail: complete web addresses, ready for <Image>. */
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  likeCount: number;
  liked: boolean;
  uploaderId: string | null;
  uploaderName: string | null;
  createdAt: number;
  canDelete: boolean;
}

export interface AlbumView {
  album: Album;
  photos: Photo[];
  /** The picture the most people liked (needs at least one like). */
  bestPhotoId: string | null;
  /** Pass to load older pictures; null when there are no more. */
  nextBefore: number | null;
}

export interface NewAlbumInput {
  title: string;
  category: EventCategory;
  eventId?: string | null;
  societyId?: string | null;
}

/** A picture chosen on the phone, not uploaded yet. */
export interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}
export const EVENT_CATEGORIES: EventCategory[] = ['Tech', 'Sports', 'Cultural', 'Career', 'Social'];

/* ── Lost & found, student card ─────────────────────────────────────────── */

export type LostKind = 'lost' | 'found';

export interface LostItem {
  id: string;
  kind: LostKind;
  title: string;
  description: string;
  place: string;
  status: 'open' | 'resolved';
  postedBy: string;
  mine: boolean;
  canManage: boolean;
  /** How many people replied (only the poster and admins see this). */
  replies: number | null;
  iReplied: boolean;
  createdAt: number;
  resolvedAt: number | null;
}

export interface NewLostItemInput {
  kind: LostKind;
  title: string;
  description: string;
  place: string;
}

export interface LostReply {
  uid: string;
  name: string;
  department: string;
  batch: string;
  createdAt: number;
}

export interface StudentCard {
  /** The QR text. It changes every 30 seconds. */
  payload: string;
  refreshAt: number;
  name: string;
  photoUrl: string | null;
  studentId: string;
  department: string;
  batch: string;
  role: Role;
  university: { id: string; name: string; fullName: string };
}

export type CardVerification =
  | { ok: true; name: string; photoUrl: string | null; studentId: string; department: string; batch: string; role: Role; detail: string }
  | { ok: false; reason: string; name?: string; detail: string };
// ── Study & career ───────────────────────────────────────────────────────────
export type NoteKind = 'notes' | 'past_paper' | 'assignment' | 'other';
export const NOTE_KINDS: { value: NoteKind; label: string }[] = [
  { value: 'notes', label: 'Notes' },
  { value: 'past_paper', label: 'Past paper' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'other', label: 'Other' },
];

export interface StudyNote {
  id: string;
  title: string;
  course: string;
  department: string;
  kind: NoteKind;
  description: string;
  status: 'visible' | 'hidden';
  uploaderName: string;
  mine: boolean;
  canManage: boolean;
  helpfulCount: number;
  iFoundHelpful: boolean;
  fileCount: number;
  createdAt: number;
}
export interface NoteFile {
  id: string;
  name: string;
  mime: string;
  bytes: number;
  /** Signed, expiring link to the file. */
  url: string;
}
export interface NoteDetail extends StudyNote {
  files: NoteFile[];
}
export interface NotesList {
  notes: StudyNote[];
  courses: string[];
}
export interface NewNoteInput {
  title: string;
  course: string;
  kind: NoteKind;
  description: string;
  files: PickedPhoto[];
}

export type BookCondition = 'new' | 'like_new' | 'good' | 'fair';
export const BOOK_CONDITIONS: { value: BookCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];
export interface MediaPicture {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}
export interface Book {
  id: string;
  title: string;
  author: string;
  course: string;
  price: number;
  condition: BookCondition;
  description: string;
  status: 'available' | 'reserved' | 'sold' | 'hidden';
  sellerName: string;
  mine: boolean;
  canManage: boolean;
  photos: MediaPicture[];
  /** Only the seller (and admins) see this; null for everyone else. */
  interestedCount: number | null;
  iAsked: boolean;
  createdAt: number;
}
export interface NewBookInput {
  title: string;
  author: string;
  course: string;
  price: number;
  condition: BookCondition;
  description: string;
  photos: PickedPhoto[];
}
export interface BookInterested {
  uid: string;
  name: string;
  department: string;
  batch: string;
  createdAt: number;
}

export interface StudyGroup {
  id: string;
  title: string;
  course: string;
  description: string;
  meeting: string;
  capacity: number | null;
  memberCount: number;
  full: boolean;
  status: 'open' | 'closed';
  createdByName: string;
  mine: boolean;
  canManage: boolean;
  joined: boolean;
  createdAt: number;
}
export interface GroupMember {
  uid: string;
  name: string;
  department: string;
  batch: string;
  isCreator: boolean;
}
export interface StudyGroupDetail extends StudyGroup {
  members: GroupMember[];
}
export interface NewGroupInput {
  title: string;
  course: string;
  description: string;
  meeting: string;
  capacity: number;
}

export type JobKind = 'job' | 'internship' | 'part_time';
export const JOB_KINDS: { value: JobKind; label: string }[] = [
  { value: 'internship', label: 'Internship' },
  { value: 'job', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
];
export interface Job {
  id: string;
  company: string;
  title: string;
  kind: JobKind;
  location: string;
  description: string;
  applyUrl: string | null;
  applyEmail: string | null;
  deadline: number | null;
  expired: boolean;
  status: 'open' | 'closed';
  saved: boolean;
  canManage: boolean;
  createdAt: number;
}
export interface NewJobInput {
  company: string;
  title: string;
  kind: JobKind;
  location: string;
  description: string;
  applyUrl: string | null;
  applyEmail: string | null;
  deadline: number | null;
}

export interface CvData {
  name: string;
  email: string;
  university: string;
  studentId: string;
  department: string;
  batch: string;
  summary: string;
  skills: string[];
  links: string[];
  eventsAttended: { title: string; date: number }[];
  volunteering: { title: string; date: number }[];
  societies: { name: string; role: string }[];
}
export interface CvProfileInput {
  summary: string;
  skills: string[];
  links: string[];
}

export type ReportTarget = 'note' | 'book' | 'study_group' | 'job' | 'lost_item' | 'photo' | 'message' | 'user' | 'story';

/* ── Campus stories (a picture and a line, gone after 24 hours) ─────────── */

export interface Story {
  id: string;
  caption: string;
  createdAt: number;
  expiresAt: number;
  /** null for a story that is only words. */
  image: MediaPicture | null;
  /** Background colour of a words-only story. */
  bg: string;
  seen: boolean;
  /** Only filled in for my own stories. */
  viewCount: number | null;
}
export interface StoryPerson {
  uid: string;
  name: string;
  photoUrl: string | null;
  mine: boolean;
  hasUnseen: boolean;
  stories: Story[];
}
export interface StoryViewer {
  uid: string;
  name: string;
  viewedAt: number;
}
export type ReportReason = 'spam' | 'inappropriate' | 'copyright' | 'scam' | 'harassment' | 'other';
export interface ModerationReport {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  title: string;
  reason: ReportReason;
  details: string;
  status: 'open' | 'actioned' | 'dismissed';
  reporter: string;
  totalReports: number;
  createdAt: number;
}
// ── Chat ─────────────────────────────────────────────────────────────────────
/** A group students made themselves (like a WhatsApp group). */
export interface ChatGroupMember {
  uid: string;
  name: string;
  photoUrl: string | null;
  role: 'member' | 'admin';
  joinedAt: number;
  isMe: boolean;
}
export interface ChatGroupInfo {
  id: string;
  name: string;
  about: string;
  onlyAdminsPost: boolean;
  createdAt: number;
  myRole: 'member' | 'admin';
  members: ChatGroupMember[];
}
export interface ChatSummary {
  id: string;
  /** 'custom' = a group students made; 'group' = a study group's room. */
  kind: 'dm' | 'society' | 'group' | 'custom';
  title: string;
  otherUserId: string | null;
  otherPhotoUrl: string | null;
  /** For a society or study-group room: the id of that society / group. */
  targetId: string | null;
  memberCount: number | null;
  lastMessage: { body: string; at: number; sender: string | null } | null;
  unread: number;
}
/** The quick reactions (the same six the server accepts). */
export const CHAT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
export interface ChatReaction {
  emoji: string;
  count: number;
  mine: boolean;
}
export interface ChatAttachment {
  kind: 'image' | 'file';
  name: string;
  mime: string;
  bytes: number;
  /** The picture, or the document download. */
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
}
/** The message a reply answers (shown as a quote above the reply). */
export interface ChatQuote {
  id: string;
  senderName: string;
  body: string;
  attachmentKind: 'image' | 'file' | null;
  deleted: boolean;
}
export interface ChatMessage {
  id: string;
  /** 'system' = a line in the middle of a group ("Ayesha added Bilal"). */
  kind: 'text' | 'system';
  senderId: string;
  senderName: string;
  /** The text, or the caption of a picture or document (may be empty). */
  body: string;
  /** Deleted for everyone: it keeps its place but has no content. */
  deleted: boolean;
  createdAt: number;
  mine: boolean;
  replyTo: ChatQuote | null;
  attachment: ChatAttachment | null;
  reactions: ChatReaction[];
}
/** How far the other people have received / read the conversation (ms). Null for big rooms, which show no ticks. */
export interface ChatReceipts {
  deliveredAt: number;
  readAt: number;
}
export interface ChatThread {
  messages: ChatMessage[];
  receipts: ChatReceipts | null;
}
export interface ChatPresence {
  online: boolean;
  lastSeenAt: number | null;
}
/** What you see when you tap a person's name in a chat. */
export interface PersonProfile {
  uid: string;
  name: string;
  photoUrl: string | null;
  department: string;
  role: Role;
  joinedAt: number;
  societies: { id: string; name: string; head: boolean }[];
}

export interface Person {
  uid: string;
  name: string;
  photoUrl: string | null;
  department: string;
  batch: string;
}

/* ── Admin: the numbers behind the university, and who came to an event ──── */

export interface AdminStats {
  members: { active: number; pending: number; suspended: number; joinedLast30Days: number };
  events: { upcoming: number; heldLast30Days: number; ticketsLast30Days: number; checkedInLast30Days: number };
  content: { postsLast30Days: number; openReports: number; openJobs: number; openLostFound: number; notes: number; booksForSale: number; openStudyGroups: number; photos: number; messagesLast7Days: number };
  membersByDepartment: { department: string; count: number }[];
  recentEvents: { id: string; title: string; startsAt: number; going: number; checkedIn: number; capacity: number | null }[];
  topSocieties: { name: string; members: number }[];
}

export interface EventAttendee {
  name: string;
  status: 'going' | 'waitlist';
  checkedInAt: number | null;
  volunteer: boolean;
  rating: number | null;
}
