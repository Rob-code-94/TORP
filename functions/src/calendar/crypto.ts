import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

/**
 * Token-encryption helpers backed by AES-256-GCM. The 32-byte key is provided
 * as a base64-encoded secret (`CALENDAR_TOKEN_ENC_KEY`). Output is a single
 * base64 blob containing iv|tag|ciphertext.
 */

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function readKey(base64Key: string): Buffer {
  const buf = Buffer.from(base64Key, 'base64');
  if (buf.length !== 32) {
    throw new Error('CALENDAR_TOKEN_ENC_KEY must decode to 32 bytes (base64).');
  }
  return buf;
}

export function encryptToken(plain: string, base64Key: string): string {
  const key = readKey(base64Key);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptToken(blobB64: string, base64Key: string): string {
  const key = readKey(base64Key);
  const blob = Buffer.from(blobB64, 'base64');
  if (blob.length < IV_LEN + TAG_LEN) {
    throw new Error('Encrypted blob too short.');
  }
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

/** SHA-256 of a string returned as hex. */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/** HMAC-SHA256 over `payload`, returned as base64url. */
export function hmacBase64Url(payload: string, base64Key: string): string {
  const key = Buffer.from(base64Key, 'base64');
  const h = createHmac('sha256', key).update(payload).digest('base64');
  return h.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Generates a fresh feed token. The plaintext is returned ONCE so the URL can
 * be sent to the client; only the SHA-256 hash is persisted.
 */
export function newFeedToken(uid: string): { plaintext: string; hash: string } {
  const random = randomBytes(24).toString('base64url');
  const plaintext = `${uid}.${random}`;
  return { plaintext, hash: sha256Hex(plaintext) };
}
