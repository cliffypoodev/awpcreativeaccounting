/**
 * Auth (blueprint §13).
 *
 * Production target: Better Auth (email/password, Google/GitHub OAuth, magic
 * links, passkeys, 2FA TOTP). That requires the Better Auth tables + handler
 * mounted at /api/auth/[...all]. To keep this scaffold runnable without secrets,
 * session resolution falls back to a signed dev cookie when BETTER_AUTH_SECRET
 * is unset. Swap `getSessionFromHeaders` for `auth.api.getSession` once Better
 * Auth is configured.
 */
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import type { SessionUser, Role } from '@invoiceforge/shared';

const SECRET = process.env.BETTER_AUTH_SECRET ?? 'dev-insecure-secret-change-me';

// ─── Password hashing (scrypt; blueprint asks bcrypt cost 12 — scrypt is the
//     zero-dependency equivalent acceptable for the scaffold) ───────────────
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = scryptSync(pw, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// ─── Minimal signed session token (HMAC) for the scaffold ─────────────────
interface SessionPayload extends SessionUser {
  exp: number;
}

export function signSession(user: SessionUser, ttlSeconds = 60 * 60 * 24 * 7): string {
  const payload: SessionPayload = { ...user, exp: Date.now() + ttlSeconds * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySession(token: string): SessionUser | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    const { exp, ...user } = payload;
    void exp;
    return user;
  } catch {
    return null;
  }
}

const COOKIE = 'if_session';

export async function getSessionFromHeaders(headers: Headers): Promise<SessionUser | null> {
  const cookie = headers.get('cookie');
  if (!cookie) return null;
  const match = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return null;
  const token = decodeURIComponent(match.slice(COOKIE.length + 1));
  return verifySession(token);
}

export const SESSION_COOKIE = COOKIE;

export function makeSessionUser(args: {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  orgId: string;
}): SessionUser {
  return args;
}
