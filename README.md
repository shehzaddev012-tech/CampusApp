# CampusHub

One app for university life: notices, events with QR tickets, guest passes, photo albums, societies and campus services. Every university gets its own private space.

React Native (CLI) · TypeScript · Node API · PostgreSQL · Android first.

## Status

- **Module 1 (Foundation):** design system, sign-in, university join and admin approval, roles, strict per-university isolation.
- **Module 2 (Feed, notifications, search):** updates feed (official / society / alert), likes, comments, bookmarks, read counts, role-gated composer, server-side notification inbox (+ FCM push once Firebase is connected), search, department channels.
- **Module 3 (Events):** events with seats and waiting list, one-tap QR ticket, gate scanner, guest passes with approval, volunteers, feedback, organiser tools.

- **Module 4 (Societies and photos):** societies with heads, join/leave, society-only updates and events; photo albums with real uploads from the phone, thumbnails, likes, a best shot and moderation.

- **Module 8 (Admin dashboard):** a web app for administrators (`campushub-admin`): overview numbers, member approval and roles, report review, notices and alerts, job postings.
- **Module 7 (Social):** one-to-one chat, society and study-group rooms, blocking, and reporting messages.
- **Module 6 (Study and career):** notes and past papers (PDF or pictures), book market with photos, study groups, jobs and internships posted by admins, a CV built from verified campus records, and reporting with an admin review queue.
- **Module 5 (Points and campus life):** points ledger, levels, weekly streak, badges, leaderboards (students, departments, societies), rewards you redeem with a code, lost & found, and a digital student card with a rotating QR that gate staff can scan.

Everything runs on the real API and PostgreSQL. There is no sample data left in the app.

## Run it locally

Two things run on your computer: the API and the app.

**1. API + database** (see `../campushub-api/README.md`)
```powershell
cd ..\campushub-api
npm install
npm run db:create ; npm run migrate ; npm run seed
npm run dev            # http://localhost:4000
```

**2. App** (emulator or USB phone)
```powershell
npm install
npm start                                  # Metro, terminal 1
adb reverse tcp:8081 tcp:8081              # device reaches Metro
adb reverse tcp:4000 tcp:4000              # device reaches the API (localhost works on both sides)
cd android ; .\gradlew.bat app:installDebug ; cd ..
adb shell am start -n com.campushub/.MainActivity
```

The sign-in screen lists the seeded test accounts (student `ayesha@iac.test`, `society@iac.test`, `admin@iac.test`, `security@iac.test` ...). See `docs/ANDROID_SETUP.md` for the Windows details.

## Folder structure

```
src/
  theme/          design tokens, ThemeProvider (light/dark + university accent)
  components/ui/  reusable UI kit
  features/       one folder per product area (auth, join, home, feed, events, admin, ...)
  navigation/     root navigator, tabs, route types
  services/       Backend interface (types.ts) + API client (api/)
  store/          zustand stores
  types/          domain types
  config/         env.ts (API_URL, Google web client id)
docs/             ARCHITECTURE.md, DESIGN_SYSTEM.md, ANDROID_SETUP.md, FIREBASE_SETUP.md
```

See `docs/ARCHITECTURE.md` for how it fits together and `docs/FIREBASE_SETUP.md` for Google sign-in + push.

## Team workflow

- One branch per feature, small pull requests, review each other's PRs.
- `npx tsc --noEmit` and `npm test` (app) plus `npm test` (API, needs the local PostgreSQL) must pass before merging.
- UI uses only components from `src/components/ui` and tokens from `src/theme`.
