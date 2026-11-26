import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE = 'lct_session';
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type SessionPayload = { uid: string };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET 환경변수가 필요합니다.');
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === 'string' ? { uid: payload.uid } : null;
  } catch {
    return null;
  }
}
