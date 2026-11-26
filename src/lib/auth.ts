import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { one } from './db';
import { SESSION_COOKIE, verifySession } from './session';

export type User = {
  id: string;
  username: string;
  display_name: string;
  is_admin: number;
};

export async function currentUser() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return one<User>(
    'SELECT id, username, display_name, is_admin FROM users WHERE id = ?',
    [session.uid],
  );
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
