/**
 * App-wide runtime configuration.
 *
 * API_URL
 *   Where the CampusHub API runs. During development the API runs on your computer and the
 *   phone/emulator reaches it through `adb reverse tcp:4000 tcp:4000` (so `localhost` works on both).
 *   For production set this to your https address, for example "https://api.campushub.app".
 *
 * GOOGLE_WEB_CLIENT_ID
 *   Firebase console -> Authentication -> Sign-in method -> Google -> Web SDK configuration.
 *   Leave empty until the Firebase project exists; the "Continue with Google" button stays
 *   hidden and the development sign-in is used instead.
 */
export const API_URL = 'http://localhost:4000';

export const GOOGLE_WEB_CLIENT_ID = '167110503186-3pqapg00h8mggkgv5kpdr2iccenbbpgg.apps.googleusercontent.com';
export const GOOGLE_SIGN_IN_ENABLED = GOOGLE_WEB_CLIENT_ID.length > 0;
