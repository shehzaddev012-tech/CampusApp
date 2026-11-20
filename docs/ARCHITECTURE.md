# CampusHub architecture

Two projects: the **app** (`CampusHub/`, React Native) and the **API** (`campushub-api/`, Node + PostgreSQL). Firebase is used only for Google sign-in and push (FCM). All data lives in PostgreSQL.

## 1. Layers

```
App:  Screens (features/*) -> Stores (zustand) -> Backend interface (services/types.ts) -> API client (services/api)
                                                                                              |  HTTPS + JSON
API:  Fastify routes (src/modules/*) -> SQL (pg) -> PostgreSQL
                      |-> Notifier -> inbox table (always) + FCM push (when Firebase is configured)
```

- **Screens** only render and call store actions.
- **Stores** hold app state. Server data arrives through `Topic`s (`services/api/topic.ts`): fetch on a timer while a screen watches, refresh straight after every change, pause when the app is in the background. No Firestore-style realtime; polling is simple and cheap at this scale (swap for SSE/WebSocket later without touching screens).
- **The API client** (`services/api/http.ts`) keeps the access token (short-lived JWT) and a rotating refresh token in AsyncStorage, refreshes once when a call returns 401, and signs the person out if refresh fails.

## 2. Session state machine

`src/store/sessionStore.ts` decides what the user sees:

```
booting -> signedOut -> needsUniversity -> pending -> active
                              ^               |
                              +-- rejected <--+
```

It follows `GET /v1/me` every few seconds, so an admin's approval moves the app to the main tabs by itself.

## 3. Multi-university isolation (enforced by the server)

- Every row of university data carries `university_id`.
- The server never trusts a university id from the app. It reads the caller's **membership** (`memberships.user_id` is the primary key, so one university per person) and scopes every query by it. A request for another university's id simply finds nothing.
- Access needs `status = 'active'`. Only admins change status or role, and only for their own university.
- Rules live in the database too: CHECK / UNIQUE constraints (one RSVP per student per event, a ticket code exists exactly when the RSVP is `going`, event ends after it starts, one student id per university).
- Counters (likes, comments, seats, check-ins) are **computed from rows**, never stored, so they cannot drift.
- Integration tests (`campushub-api/test/isolation.test.ts`) prove a second university cannot read or write the first one's data.

Roles: `student`, `society_head`, `dept_admin`, `uni_admin`, `security`. The role table (`campushub-api/src/domain.ts`) mirrors `src/types/domain.ts`.

## 4. Sign-in

- **Email + password:** sign-up (`POST /v1/auth/register` -> emailed code -> `/auth/verify-email`) creates the account only after the code is confirmed; sign-in is password + emailed code (`/auth/login` -> `/auth/login/verify`); `/auth/forgot` + `/auth/reset` reset a password. Screens: `src/features/auth/`. Details and limits are in `campushub-api/README.md`.
- **Production:** "Continue with Google" -> Firebase ID token -> `POST /v1/auth/google` -> the API verifies it with the Firebase Admin SDK and returns its own tokens.
- **Development:** `AUTH_MODE=dev` lets the app pick a seeded `.test` account (`POST /v1/auth/dev`). The API **refuses to start** in production with `AUTH_MODE=dev`.
- Refresh tokens are stored hashed, rotate on use and are revoked on sign-out / account deletion.

## 5. Feed, notifications, search (Module 2)

- Posts: `kind` official | society | alert, optional department `channel`, `pinned`. Who may post each kind is a role table checked on the server.
- Order in the app: fresh alerts (24 h), pinned, newest (`sortFeed`).
- Likes, bookmarks, "read once" and comments are rows; `GET /v1/posts` returns the posts plus the caller's liked / bookmarked ids.
- **Notifications** are written to the `notifications` table first (this is the inbox, identical on every phone), then pushed through FCM if a device token exists. With no Firebase the inbox still works: the app polls it and shows a banner for new unread items.
- Search covers updates and events (live) and societies (sample data until Module 4).

## 6. Events, tickets, guest passes (Module 3)

- **Ticket = a `going` RSVP.** QR payload `CH1|T|uni|event|uid|code` (guest pass: `CH1|G|uni|event|passId|code`). The `code` is 24 characters from `crypto.randomBytes`, made on the server, returned only to its owner and compared with `timingSafeEqual`.
- **Seats** are taken in a transaction that locks the event row (`SELECT ... FOR UPDATE`), so the last seat can never go to two students. When full the student joins the waiting list. When a seat frees up, the first waiting student is promoted in the same transaction and notified.
- **Check-in** is one atomic `UPDATE ... WHERE checked_in_at IS NULL RETURNING`, so two gates cannot admit the same ticket. It is open from 3 h before the start until 2 h after the end, and only for security / organisers / admins of that university.
- **Guest passes:** max 2 per student per event, approved by staff, scanned like tickets.
- **Reminders:** `src/jobs/reminders.ts` notifies going students 24 h and 1 h before the start; the sent flag is set in the same UPDATE, so nobody is told twice.
- Left for later: event chat (Module 7) and the app-less guest link (needs the web dashboard).

## 7. Societies and photo albums (Module 4)

- **Societies** belong to one university. Anyone approved can join or leave (one tap); admins create them and choose their **heads** (`PUT /v1/societies/:id/heads/:userId`), which also gives that person the society-head role. When someone no longer heads any society, the role goes back to student.
- A society head can only speak for **their own** society: a society update (`kind: society`) must name the society, the server uses the society's name as the byline, and events can be created only for a society you head. Admins can act for any society or as the university.
- **Isolation in the database:** `society_members`, `albums`, `photos`, and the `society_id` / `event_id` links on posts, events and albums all use composite foreign keys that include `university_id`. A row can never point at something owned by another university, whatever the code does (tests try it).
- **Photos:** any approved member can add pictures to any album of their university (up to 10 per upload, 10 MB each, 200 a day). Every file is decoded and re-encoded on the server (`src/media/image.ts`): proves it is an image, strips EXIF/location, fixes rotation, resizes to 2048 px and makes a 480 px thumbnail. Only the bytes the server produced are stored or served.
- **Who sees a picture:** the app asks for an album and gets **signed links** (`/v1/files/:id/:size?exp&sig`) that need no sign-in header (so `<Image>` works), are tied to one picture and size, expire after 1-2 days and stay the same all day (phone caching). Links are only given to approved members of that university.
- **Likes and the best shot:** one like per person per photo; the most-liked photo is the album's "best shot" and cover. A photo can be removed by who added it, the album's creator or an admin; deleting an album or an account removes the files too.
- **Where files live:** `src/storage/` has a small interface. Today it is a folder on the server (`UPLOADS_DIR`, git-ignored). For several servers or serverless hosting add an S3 / Cloudflare R2 implementation of the same interface; nothing else changes.

## 8. Points, rewards, lost & found, student card (Module 5)

- **Points are decided by the server, from things that really happened**, never by the app. They are a **ledger** (`point_ledger`): a balance is the SUM of its rows, never a stored number. `UNIQUE (user, kind, ref)` makes every award happen at most once, so joining/leaving a society or liking/unliking a photo again and again cannot farm points. Un-doing the action (delete the photo, remove the like) takes the points back.
- **What earns what** (`src/points/index.ts`): scanned ticket +10, volunteering at an attended event +15, rating an attended event +3, first join of a society +5, a photo +2 (first 5 a day), a like on your photo +1. Having a ticket earns nothing: only the gate scan does. Guest passes earn nothing.
- **Levels** (Newcomer ... Legend), a **weekly streak**, and **10 badges** with progress are all computed from the ledger and real rows. Badges are awarded by `evaluateBadges` after each award and the person is told once.
- **Leaderboards:** students (week / month / all time), departments (ranked by points **per student**, so small departments are fair) and societies (events held, then people who came). A student can hide their name; their points still count for their department. Spending points never lowers a rank.
- **Rewards:** admins create rewards (cost, optional stock). Redeeming runs in one transaction with a per-person lock, so the balance cannot go below zero and the last item goes to one student even if two tap together. The student gets a code (`K7M2-9XQD`) that only they see; staff type it to hand the reward over (staff never see codes in lists). Cancelling a waiting redemption refunds the points and the stock.
- **Lost & found:** per university; replying tells the poster (once per person); only the poster and admins see who replied.
- **Digital student card:** `GET /v1/card` gives a QR signed by the server that **changes every 30 seconds** (a screenshot dies within about 2 minutes). Gate staff scan it in the same scanner and see who the person is and whether they are an approved member.
- **Isolation:** every new table references `memberships (user_id, university_id)`, so leaving a university deletes the points, badges, redemptions and posts with it, and nothing can mix two universities.

## 9. Study and career (Module 6)

- **Files**: notes accept PDFs (checked by their `%PDF-` header, never by name or declared type) and pictures (re-encoded, EXIF stripped). PDFs are served as downloads. Every file and picture link is signed and expires (`src/media/signedUrl.ts`), so a link cannot be guessed or used by another university.
- **Pictures for listings** are uploaded first (`POST /v1/media`, up to 3) and then attached to a book by id; the server accepts only the caller's own, unattached pictures.
- **Notes, books, study groups** are per-university rows tied to the member through `memberships`, so leaving or deleting an account removes them (files are deleted explicitly). Study-group seats are guarded by a row lock, so the last seat goes to one person.
- **Jobs** are posted only by admins, need an `https` apply link or an email, and disappear when closed or past the deadline.
- **CV**: what the student types (summary, skills, links) is stored; events, societies and badges are read live from the university's records, so they cannot be faked. Sharing is plain text through the phone's share sheet.
- **Reports** (`content_reports`): one per person per item, reviewed by admins (`/admin/reports`); "remove" hides/closes/deletes the item or suspends a person.
## 9b. Chat and blocking (Module 7)

- Three kinds of conversation: one-to-one, a society's room and a study group's room. Rooms have no member list of their own: whoever is in `society_members` / `study_group_members` can read and write, so leaving the society or group closes the room for you at once.
- Every message and conversation hangs off `memberships`, so leaving the university removes your messages and your one-to-one chats, and nothing can cross universities.
- The phone asks for new messages every few seconds while a chat is open (`?after=<ms>`), and the list every 8 seconds. Only one-to-one messages send a push; rooms stay quiet on purpose.
- Blocking works both ways: neither person can message the other, find them in search, or see the chat; in a shared room you stop seeing the blocked person's messages.
- Any message can be reported (long-press); the report goes to the admin queue like everything else, and "remove" deletes the message.
## 9a. Theming

All visuals come from `src/theme/tokens.ts` (see `DESIGN_SYSTEM.md`). `ThemeProvider` gives light/dark mode and sets the university accent colour.

## 10. "Are you sure?" popups

Anything that deletes, removes, leaves or cancels asks first with one consistent popup: `await confirm({ title, message, confirmLabel, tone })` (`src/utils/confirm.ts`, shown by `ConfirmHost`). Use `tone: 'neutral'` for questions that are not destructive.

## 11. Adding a feature (recipe)

1. SQL migration in `campushub-api/migrations/` (never edit an applied one; the runner checks checksums). Put `university_id` in every foreign key to university-owned rows.
2. Route module in `campushub-api/src/modules/`, always scoped by the caller's university; add integration tests (including "another university gets 404").
3. Types in `src/types`, method on the interface in `src/services/types.ts`, implementation in `src/services/api/apiBackend.ts`.
4. Screens in `src/features/<area>/` using only `components/ui`; register in `src/navigation`. Ask with `confirm()` before anything destructive.

## 12. Module plan

1. Foundation (done)
2. Feed, notifications (FCM), search (done)
3. Events, QR tickets, check-in, guest passes (done)
4. Societies, photo albums (done)
5. Points, badges, leaderboards, rewards, lost & found, student card (done)
6. Study and career (done)
7. Social: chat and blocking (done)
8. Admin web dashboard, `campushub-admin` (done; events, societies and rewards management still live in the phone app)