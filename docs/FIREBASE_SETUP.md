# Firebase setup (Google sign-in + push only)

Firebase is **optional during development**: the app signs in with seeded test accounts and the notification inbox works without it. You need Firebase for two things before real users arrive: **Google sign-in** and **push notifications (FCM)**. No Firestore, no Cloud Functions.

## 1. Create the project
1. https://console.firebase.google.com -> Add project (e.g. `campushub`).
2. Add an **Android app**, package name `com.campushub`.
3. Download **google-services.json** into `android/app/` (Gradle enables Firebase when the file exists).

## 2. SHA fingerprints (needed for Google sign-in)
```powershell
cd android
.\gradlew signingReport
```
Add the **SHA-1** and **SHA-256** of the `debug` variant (each developer adds their own) and later the release key, in Firebase console -> Project settings -> Your apps -> Android. Download google-services.json again.

## 3. Google sign-in
- Authentication -> Sign-in method -> **Google** -> Enable.
- Copy the **Web client ID** into `src/config/env.ts` (`GOOGLE_WEB_CLIENT_ID`). The "Continue with Google" button appears once it is set.

## 4. Let the API verify tokens and send push
- Project settings -> Service accounts -> **Generate new private key** (a JSON file).
- Put it on the API server, never in git. In the API's `.env` set:
  ```
  AUTH_MODE=firebase
  FIREBASE_SERVICE_ACCOUNT=<path to that JSON file on the server>
  ```
  With `AUTH_MODE=firebase` the dev sign-in endpoints are off, and pushes go out through FCM.

## 5. First admin
Sign in once with the person who should be the first admin, then in PostgreSQL:
```sql
UPDATE memberships SET status = 'active', role = 'uni_admin'
WHERE user_id = (SELECT id FROM users WHERE lower(email) = lower('admin@university.edu'));
```
After that, admins approve students from the app (Profile -> Members) and the web dashboard (Module 8).

## 6. Test push
Run the app, sign in, Notifications -> *Turn on notifications*, then publish a post as an admin. The phone registers its FCM token with `PUT /v1/devices`; the API writes the inbox row and sends the push.

## Costs
Authentication and FCM are free at this scale. No Blaze plan is needed, because the API (not Cloud Functions) sends the pushes.
