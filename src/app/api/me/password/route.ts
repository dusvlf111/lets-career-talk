import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { HttpError, requireUser, route } from '@/lib/auth';
import { one, run } from '@/lib/db';

const BCRYPT_ROUNDS = 10;

const schema = z.object({
  current: z.string().min(1),
  next: z.string().min(8, '새 비밀번호는 8자 이상이어야 해요.').max(72),
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.');
  const row = await one<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [user.id]);
  if (!row || !(await bcrypt.compare(parsed.data.current, row.password_hash))) {
    throw new HttpError(400, '현재 비밀번호가 올바르지 않아요.');
  }
  await run('UPDATE users SET password_hash = ? WHERE id = ?', [
    await bcrypt.hash(parsed.data.next, BCRYPT_ROUNDS),
    user.id,
  ]);
});
