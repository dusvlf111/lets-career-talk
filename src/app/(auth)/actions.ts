'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { DEFAULT_CHANNEL_IDS, one, run } from '@/lib/db';
import { joinChannel, newId } from '@/lib/chat';
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, signSession } from '@/lib/session';
import { effectiveInviteCode } from '@/lib/settings';

export type AuthState = { error?: string; ok?: boolean } | undefined;

const BCRYPT_ROUNDS = 10;

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, '아이디는 영문/숫자/_ 3~20자로 입력해주세요.'),
  displayName: z.string().trim().min(1, '이름을 입력해주세요.').max(20, '이름은 20자까지 가능해요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 해요.').max(72),
  inviteCode: z.string().trim(),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, '아이디를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

async function startSession(uid: string) {
  const token = await signSession({ uid });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? '입력값을 확인해주세요.';
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { username, displayName, password, inviteCode } = parsed.data;

  const expected = await effectiveInviteCode();
  if (!expected) return { error: '입장 암호가 아직 설정되지 않았어요. 운영진에게 문의해주세요.' };
  if (inviteCode !== expected) return { error: '입장 암호가 올바르지 않아요.' };

  const exists = await one('SELECT 1 FROM users WHERE username = ?', [username]);
  if (exists) return { error: '이미 사용 중인 아이디예요.' };

  const id = newId();
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const isFirstUser = !(await one('SELECT 1 FROM users LIMIT 1'));
  await run(
    `INSERT INTO users (id, username, display_name, password_hash, is_admin, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, username, displayName, hash, isFirstUser ? 1 : 0, isFirstUser ? 'owner' : 'member', Date.now()],
  );
  await Promise.all(DEFAULT_CHANNEL_IDS.map((cid) => joinChannel(id, cid)));
  await startSession(id);
  return { ok: true };
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { username, password } = parsed.data;

  const user = await one<{ id: string; password_hash: string; deactivated_at: number | null }>(
    'SELECT id, password_hash, deactivated_at FROM users WHERE username = ?',
    [username],
  );
  const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !ok) return { error: '아이디 또는 비밀번호가 올바르지 않아요.' };
  if (user.deactivated_at) return { error: '비활성화된 계정이에요. 운영진에게 문의해주세요.' };

  await startSession(user.id);
  return { ok: true };
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
