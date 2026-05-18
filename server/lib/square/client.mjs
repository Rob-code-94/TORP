import { SquareClient } from 'square';
import { getSquareAccessToken, resolveSquareEnvironment } from './env.mjs';

/** @type {SquareClient | null | undefined} */
let cached;

export function getSquareClient() {
  if (cached !== undefined) return cached;
  const token = getSquareAccessToken();
  if (!token) {
    cached = null;
    return null;
  }
  cached = new SquareClient({
    token,
    environment: resolveSquareEnvironment(),
  });
  return cached;
}
