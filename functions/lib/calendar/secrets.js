import { defineSecret } from 'firebase-functions/params';
/**
 * Secrets used by the calendar module. Define them once here so each callable
 * declares the same `secrets: [...]` allow-list.
 *
 * Set via:
 *   firebase functions:secrets:set GOOGLE_OAUTH_CLIENT_ID
 *   firebase functions:secrets:set GOOGLE_OAUTH_CLIENT_SECRET
 *   firebase functions:secrets:set CALENDAR_TOKEN_ENC_KEY    # 32-byte base64
 *   firebase functions:secrets:set CALENDAR_FEED_HMAC_KEY    # 32-byte base64
 */
export const GOOGLE_OAUTH_CLIENT_ID = defineSecret('GOOGLE_OAUTH_CLIENT_ID');
export const GOOGLE_OAUTH_CLIENT_SECRET = defineSecret('GOOGLE_OAUTH_CLIENT_SECRET');
export const CALENDAR_TOKEN_ENC_KEY = defineSecret('CALENDAR_TOKEN_ENC_KEY');
export const CALENDAR_FEED_HMAC_KEY = defineSecret('CALENDAR_FEED_HMAC_KEY');
export const CALENDAR_SECRETS = [
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
    CALENDAR_TOKEN_ENC_KEY,
    CALENDAR_FEED_HMAC_KEY,
];
