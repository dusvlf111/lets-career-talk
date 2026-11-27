import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { one } from './db';
import { memo } from './memo';
import { SESSION_COOKIE, verifySession } from './session';

export type Role = 'owner' | 'admin' | 'member';

export type User = {
  id: string;
  username: string;
  display_name: string;
  is_admin: number;
  role: Role;
  deactivated_at: number | null;
};

/** 소유자와 관리자는 관리 권한을 가진다 */
export function isAdmin(user: Pick<User, 'role'>) {
  return user.role === 'owner' || user.role === 'admin';
}

/**
 * 서버 인스턴스마다 따로 캐시되므로 다른 인스턴스에서 역할 변경·비활성화를 해도
 * 최대 이 시간만큼 늦게 반영된다. 짧게 유지한다.
 */
const USER_CACHE_TTL_MS = 15 * 1000;
const userCache = memo<User | null>(USER_CACHE_TTL_MS);

export async function currentUser() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await userCache.get(session.uid, () =>
    one<User>(
      'SELECT id, username, display_name, is_admin, role, deactivated_at FROM users WHERE id = ?',
      [session.uid],
    ),
  );
  // 비활성화된 멤버는 로그인 상태여도 접근 불가
  if (!user || user.deactivated_at) return null;
  return user;
}

/** 역할·이름 등이 바뀌면 이 인스턴스의 캐시를 비운다 */
export function forgetUser(userId: string) {
  userCache.delete(userId);
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user)) throw new HttpError(403, '관리자만 할 수 있어요.');
  return user;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, '로그인이 필요합니다.');
  return user;
}

/** API 라우트 공통 래퍼: HttpError를 JSON 응답으로 바꾼다. */
export function route<A extends unknown[]>(
  handler: (...args: A) => Promise<unknown>,
) {
  return async (...args: A) => {
    try {
      const data = await handler(...args);
      if (data instanceof Response) return data;
      return NextResponse.json(data ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      console.error(e);
      return NextResponse.json(
        { error: '서버 오류가 발생했습니다.' },
        { status: 500 },
      );
    }
  };
}
