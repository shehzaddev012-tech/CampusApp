import type { University } from '../types/domain';

export type AuthStackParamList = {
  Onboarding: undefined;
  SignIn: undefined;
  SignUp: undefined;
  /** The emailed 6-digit code: finishes sign-up, or the second step of sign-in. */
  VerifyCode: { email: string; purpose: 'signup' | 'login'; resendAfterSeconds: number };
  ForgotPassword: undefined;
  ResetPassword: { email: string; resendAfterSeconds: number };
};

export type JoinStackParamList = {
  StudentDetails: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Events: undefined;
  Photos: undefined;
  Societies: undefined;
  Profile: undefined;
};

/** Everything an approved student can reach. The tabs live inside this stack. */
export type AppStackParamList = {
  Tabs: undefined;
  /** `saved` shows only the posts the student bookmarked. */
  Feed: { saved?: boolean } | undefined;
  PostDetail: { postId: string };
  /** societyId pre-selects the society for a society update. */
  Composer: { societyId?: string } | undefined;
  Search: undefined;
  Notifications: undefined;
  EventDetail: { eventId: string };
  /** The student's QR ticket for one event. */
  Ticket: { eventId: string };
  MyTickets: undefined;
  GuestPass: { eventId: string };
  /** Gate scanner. When `eventId` is set, tickets for other events are rejected. */
  Scanner: { eventId?: string } | undefined;
  GuestApprovals: undefined;
  /** Publish a new event (no id) or change one. */
  EventComposer: { eventId?: string } | undefined;
  /** Admin: approve or reject students who asked to join. */
  Members: undefined;
  /** Admin: the numbers and every admin tool. */
  AdminHome: undefined;
  /** Organiser / admin: who has a ticket and who came. */
  EventAttendees: { eventId: string; title: string };
  SocietyDetail: { societyId: string };
  /** Create a society (no id) or edit one. */
  SocietyForm: { societyId?: string } | undefined;
  /** Admin: choose who becomes a head of the society. */
  MemberPicker: { societyId: string };
  Album: { albumId: string };
  /** Full-screen viewer for the album that is open (reads it from the album store). */
  PhotoViewer: { photoId: string };
  /** Create an album (no id) or rename one. */
  AlbumForm: { albumId?: string; societyId?: string } | undefined;
  LostFound: undefined;
  LostItemForm: undefined;
  LostReplies: { itemId: string; title: string };
  /** The digital student card with its rotating QR code. */
  StudentCard: undefined;
  Notes: undefined;
  NoteDetail: { noteId: string };
  NoteForm: undefined;
  Books: undefined;
  BookDetail: { bookId: string };
  BookForm: undefined;
  Groups: undefined;
  GroupDetail: { groupId: string };
  GroupForm: undefined;
  Jobs: undefined;
  /** Admin: post a job or internship. */
  JobForm: undefined;
  Cv: undefined;
  /** Admin: reports from students. */
  Reports: undefined;
  Chats: undefined;
  NewChat: undefined;
  /** Full-screen stories: everyone who posted, and which person to start at. */
  StoryViewer: { people: import('../types/domain').StoryPerson[]; start: number };
  AddStory: undefined;
  /** My name and profile picture. */
  EditProfile: undefined;
  Privacy: undefined;
  Chat: { chatId: string; title: string; kind: 'dm' | 'society' | 'group' | 'custom'; otherUserId?: string; photoUrl?: string | null; targetId?: string | null };
  /** Someone's profile: photo, school, role and societies. */
  PersonProfile: { userId: string };
  /** Make a group chat: a name and the people to put in it. */
  NewGroup: undefined;
  /** Members, admins and settings of a group students made. */
  GroupChatInfo: { chatId: string };
};
